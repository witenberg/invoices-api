-- Add tracking columns to app.invoices table for invoice status tracking
ALTER TABLE app.invoices
ADD COLUMN opened_at TIMESTAMP,
ADD COLUMN sent_at TIMESTAMP,

-- Add comment for documentation
COMMENT ON COLUMN app.invoices.opened_at IS 'Timestamp when the invoice was first opened by the client';
COMMENT ON COLUMN app.invoices.sent_at IS 'Timestamp when the invoice was sent to the client';;

-- Update existing "Sent" invoices to have a sent_at timestamp (use current date as fallback)
UPDATE app.invoices
SET sent_at = COALESCE(date, CURRENT_TIMESTAMP)
WHERE status = 'Sent' AND sent_at IS NULL;

-- Create index for better performance on tracking queries
CREATE INDEX idx_invoices_opened_at ON app.invoices(opened_at);
CREATE INDEX idx_invoices_sent_at ON app.invoices(sent_at);