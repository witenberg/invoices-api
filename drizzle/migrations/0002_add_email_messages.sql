-- Add email message fields to users table
ALTER TABLE "users" ADD COLUMN "unpaid_message" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "paid_message" VARCHAR(255); 