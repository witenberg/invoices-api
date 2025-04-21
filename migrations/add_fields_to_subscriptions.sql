-- Add new columns to app.subscriptions table
ALTER TABLE app.subscriptions
ADD COLUMN salestaxname VARCHAR(255),
ADD COLUMN secondtaxname VARCHAR(255),
ADD COLUMN total NUMERIC(10, 2);

-- Update existing records to calculate total based on products, discount, and taxes
UPDATE app.subscriptions
SET total = (
    -- Calculate base amount from products
    (SELECT COALESCE(SUM(value->'amount' * value->'quantity'), 0)
     FROM jsonb_array_elements(products))
    
    -- Apply discount if exists
    * (1 - COALESCE(discount, 0)/100)
    
    -- Add salestax if exists
    * (1 + COALESCE(salestax, 0)/100)
    
    -- Add secondtax if exists
    * (1 + COALESCE(secondtax, 0)/100)
); 