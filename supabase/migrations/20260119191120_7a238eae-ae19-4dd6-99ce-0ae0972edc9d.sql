-- Add notification_offer_redemption column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_offer_redemption boolean DEFAULT true;