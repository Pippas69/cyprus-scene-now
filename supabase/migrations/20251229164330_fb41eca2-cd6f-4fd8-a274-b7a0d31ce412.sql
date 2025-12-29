-- Add notification preference columns for ticket sales
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS notification_ticket_sales BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_daily_sales_summary BOOLEAN DEFAULT true;