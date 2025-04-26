-- Add isDeleted column to app.sales_pages table
ALTER TABLE app.sales_pages
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Update existing records to set is_deleted to false
UPDATE app.sales_pages
SET is_deleted = FALSE; 