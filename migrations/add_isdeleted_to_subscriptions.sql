-- Add isDeleted column to app.subscriptions table
ALTER TABLE app.subscriptions
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Update existing records to set is_deleted to false
UPDATE app.subscriptions
SET is_deleted = FALSE; 