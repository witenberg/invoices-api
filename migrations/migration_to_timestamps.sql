-- Migration to convert all date fields to TIMESTAMP WITH TIME ZONE
-- This migration converts all date fields to store timestamps in UTC

-- 1. Update users table
ALTER TABLE app.users 
ALTER COLUMN trial_end_date TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN trial_end_date IS NOT NULL THEN trial_end_date::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.users 
ALTER COLUMN subscription_end_date TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN subscription_end_date IS NOT NULL THEN subscription_end_date::timestamp with time zone
    ELSE NULL 
  END;

-- 2. Update logs table
ALTER TABLE app.logs 
ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN timestamp IS NOT NULL THEN timestamp::timestamp with time zone
    ELSE NULL 
  END;

-- 3. Update subscriptions table
ALTER TABLE app.subscriptions 
ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN start_date IS NOT NULL THEN start_date::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.subscriptions 
ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN end_date IS NOT NULL THEN end_date::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.subscriptions 
ALTER COLUMN next_invoice TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN next_invoice IS NOT NULL THEN next_invoice::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.subscriptions 
ALTER COLUMN last_reminder_sent TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN last_reminder_sent IS NOT NULL THEN last_reminder_sent::timestamp with time zone
    ELSE NULL 
  END;

-- 4. Update invoices table
ALTER TABLE app.invoices 
ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN date IS NOT NULL THEN date::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.invoices 
ALTER COLUMN payment_date TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN payment_date IS NOT NULL THEN payment_date::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.invoices 
ALTER COLUMN opened_at TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN opened_at IS NOT NULL THEN opened_at::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.invoices 
ALTER COLUMN sent_at TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN sent_at IS NOT NULL THEN sent_at::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.invoices 
ALTER COLUMN last_reminder_sent TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN last_reminder_sent IS NOT NULL THEN last_reminder_sent::timestamp with time zone
    ELSE NULL 
  END;

-- 5. Update email_verification_tokens table
ALTER TABLE app.email_verification_tokens 
ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN expires_at IS NOT NULL THEN expires_at::timestamp with time zone
    ELSE NULL 
  END;

-- 6. Update sales_pages table
ALTER TABLE app.sales_pages 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN created_at IS NOT NULL THEN created_at::timestamp with time zone
    ELSE NULL 
  END;

ALTER TABLE app.sales_pages 
ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING 
  CASE 
    WHEN updated_at IS NOT NULL THEN updated_at::timestamp with time zone
    ELSE NULL 
  END;

-- 7. Update default values for timestamp fields
ALTER TABLE app.invoices 
ALTER COLUMN date SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE app.logs 
ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE app.sales_pages 
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE app.sales_pages 
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- 8. Create indexes for better performance on timestamp queries
CREATE INDEX IF NOT EXISTS idx_invoices_date ON app.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_date ON app.invoices(payment_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON app.invoices(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_opened_at ON app.invoices(opened_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON app.subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_invoice ON app.subscriptions(next_invoice);
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON app.users(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON app.users(subscription_end_date);

-- 9. Add comments for documentation
COMMENT ON COLUMN app.invoices.date IS 'Invoice creation date in UTC';
COMMENT ON COLUMN app.invoices.payment_date IS 'Payment due date in UTC';
COMMENT ON COLUMN app.invoices.sent_at IS 'Timestamp when invoice was sent in UTC';
COMMENT ON COLUMN app.invoices.opened_at IS 'Timestamp when invoice was first opened in UTC';
COMMENT ON COLUMN app.subscriptions.start_date IS 'Subscription start date in UTC';
COMMENT ON COLUMN app.subscriptions.next_invoice IS 'Next invoice generation date in UTC';
COMMENT ON COLUMN app.users.trial_end_date IS 'Trial end date in UTC';
COMMENT ON COLUMN app.users.subscription_end_date IS 'Subscription end date in UTC'; 