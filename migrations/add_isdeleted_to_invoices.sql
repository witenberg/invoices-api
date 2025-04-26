-- Add isDeleted column to app.invoices table
ALTER TABLE app.invoices
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Update existing records to set is_deleted to false
UPDATE app.invoices
SET is_deleted = FALSE; 