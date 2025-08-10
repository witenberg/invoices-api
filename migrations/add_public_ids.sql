-- Migration: Add public IDs to all entities
-- This migration adds public_id columns to users, clients, subscriptions, invoices, and sales_pages tables
-- and populates them with appropriate values for existing records

-- Add public_id column to users table
ALTER TABLE app.users ADD COLUMN public_id VARCHAR(20);

-- Add public_id column to clients table  
ALTER TABLE app.clients ADD COLUMN public_id VARCHAR(20);

-- Add public_id column to subscriptions table
ALTER TABLE app.subscriptions ADD COLUMN public_id VARCHAR(20);

-- Add public_id column to invoices table
ALTER TABLE app.invoices ADD COLUMN public_id VARCHAR(20);

-- Add public_id column to sales_pages table
ALTER TABLE app.sales_pages ADD COLUMN public_id VARCHAR(20);

-- Populate public_id for existing users
WITH numbered_users AS (
    SELECT userid, ROW_NUMBER() OVER (ORDER BY userid) as rn
    FROM app.users
    WHERE public_id IS NULL
)
UPDATE app.users 
SET public_id = 'usr-' || LPAD(u.rn::TEXT, 6, '0')
FROM numbered_users u
WHERE app.users.userid = u.userid;

-- Populate public_id for existing clients
WITH numbered_clients AS (
    SELECT clientid, ROW_NUMBER() OVER (ORDER BY clientid) as rn
    FROM app.clients
    WHERE public_id IS NULL
)
UPDATE app.clients 
SET public_id = 'cli-' || LPAD(c.rn::TEXT, 6, '0')
FROM numbered_clients c
WHERE app.clients.clientid = c.clientid;

-- Populate public_id for existing subscriptions
WITH numbered_subscriptions AS (
    SELECT subscriptionid, ROW_NUMBER() OVER (ORDER BY subscriptionid) as rn
    FROM app.subscriptions
    WHERE public_id IS NULL
)
UPDATE app.subscriptions 
SET public_id = 'sub-' || LPAD(s.rn::TEXT, 6, '0')
FROM numbered_subscriptions s
WHERE app.subscriptions.subscriptionid = s.subscriptionid;

-- Populate public_id for existing invoices
WITH numbered_invoices AS (
    SELECT invoiceid, ROW_NUMBER() OVER (ORDER BY invoiceid) as rn
    FROM app.invoices
    WHERE public_id IS NULL
)
UPDATE app.invoices 
SET public_id = 'inv-' || LPAD(i.rn::TEXT, 6, '0')
FROM numbered_invoices i
WHERE app.invoices.invoiceid = i.invoiceid;

-- Populate public_id for existing sales_pages
WITH numbered_sales_pages AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn
    FROM app.sales_pages
    WHERE public_id IS NULL
)
UPDATE app.sales_pages 
SET public_id = 'sal-' || LPAD(sp.rn::TEXT, 6, '0')
FROM numbered_sales_pages sp
WHERE app.sales_pages.id = sp.id;

-- Make public_id columns NOT NULL and UNIQUE
ALTER TABLE app.users ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE app.users ADD CONSTRAINT users_public_id_unique UNIQUE (public_id);

ALTER TABLE app.clients ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE app.clients ADD CONSTRAINT clients_public_id_unique UNIQUE (public_id);

ALTER TABLE app.subscriptions ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE app.subscriptions ADD CONSTRAINT subscriptions_public_id_unique UNIQUE (public_id);

ALTER TABLE app.invoices ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE app.invoices ADD CONSTRAINT invoices_public_id_unique UNIQUE (public_id);

ALTER TABLE app.sales_pages ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE app.sales_pages ADD CONSTRAINT sales_pages_public_id_unique UNIQUE (public_id);

-- Create sequences for auto-incrementing public IDs
CREATE SEQUENCE IF NOT EXISTS app.users_public_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.clients_public_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.subscriptions_public_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.invoices_public_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS app.sales_pages_public_id_seq START 1;

-- Set the sequences to start from the next available number
SELECT setval('app.users_public_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(public_id FROM 5) AS INTEGER)) FROM app.users), 0) + 1);
SELECT setval('app.clients_public_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(public_id FROM 5) AS INTEGER)) FROM app.clients), 0) + 1);
SELECT setval('app.subscriptions_public_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(public_id FROM 5) AS INTEGER)) FROM app.subscriptions), 0) + 1);
SELECT setval('app.invoices_public_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(public_id FROM 5) AS INTEGER)) FROM app.invoices), 0) + 1);
SELECT setval('app.sales_pages_public_id_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(public_id FROM 5) AS INTEGER)) FROM app.sales_pages), 0) + 1);

-- Create functions to generate public IDs
CREATE OR REPLACE FUNCTION app.generate_user_public_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.public_id := 'usr-' || LPAD(nextval('app.users_public_id_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.generate_client_public_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.public_id := 'cli-' || LPAD(nextval('app.clients_public_id_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.generate_subscription_public_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.public_id := 'sub-' || LPAD(nextval('app.subscriptions_public_id_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.generate_invoice_public_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.public_id := 'inv-' || LPAD(nextval('app.invoices_public_id_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.generate_sales_page_public_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.public_id := 'sal-' || LPAD(nextval('app.sales_pages_public_id_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically generate public IDs
CREATE TRIGGER users_public_id_trigger
    BEFORE INSERT ON app.users
    FOR EACH ROW
    WHEN (NEW.public_id IS NULL)
    EXECUTE FUNCTION app.generate_user_public_id();

CREATE TRIGGER clients_public_id_trigger
    BEFORE INSERT ON app.clients
    FOR EACH ROW
    WHEN (NEW.public_id IS NULL)
    EXECUTE FUNCTION app.generate_client_public_id();

CREATE TRIGGER subscriptions_public_id_trigger
    BEFORE INSERT ON app.subscriptions
    FOR EACH ROW
    WHEN (NEW.public_id IS NULL)
    EXECUTE FUNCTION app.generate_subscription_public_id();

CREATE TRIGGER invoices_public_id_trigger
    BEFORE INSERT ON app.invoices
    FOR EACH ROW
    WHEN (NEW.public_id IS NULL)
    EXECUTE FUNCTION app.generate_invoice_public_id();

CREATE TRIGGER sales_pages_public_id_trigger
    BEFORE INSERT ON app.sales_pages
    FOR EACH ROW
    WHEN (NEW.public_id IS NULL)
    EXECUTE FUNCTION app.generate_sales_page_public_id();
