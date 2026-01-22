-- Add new notification preference columns for businesses
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS notification_weekly_summary boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_almost_sold_out boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sold_out boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_creation_success boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_boost_success boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_plan_change boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_reservation_cancelled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_new_message boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_new_follower boolean DEFAULT true;

-- Drop the old daily_sales_summary column if it exists (replacing with weekly)
-- We keep it for backward compatibility but won't use it
COMMENT ON COLUMN public.user_preferences.notification_daily_sales_summary IS 'Deprecated - replaced by notification_weekly_summary';