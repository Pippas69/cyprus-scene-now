-- Add new preference columns for follower notifications
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_followed_business_events BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_followed_business_offers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_tickets_selling_out BOOLEAN DEFAULT true;