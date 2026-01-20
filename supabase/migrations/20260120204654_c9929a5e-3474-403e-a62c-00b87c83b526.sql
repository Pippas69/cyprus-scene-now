-- Add new notification preference columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS notification_personalized_events boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_personalized_offers boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_boosted_content boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_expiring_offers boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_ticket_confirmations boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_offer_confirmations boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_fomo_recommendations boolean DEFAULT true;

-- Create a table to track sent notifications to avoid duplicates
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  reference_id uuid,
  reference_type text,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notification_log
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create policy for notification_log (only system can insert, users can read their own)
CREATE POLICY "Users can view their own notification logs"
ON public.notification_log
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_log_user_type ON public.notification_log(user_id, notification_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON public.notification_log(sent_at);

-- Add comment for documentation
COMMENT ON TABLE public.notification_log IS 'Tracks sent notifications to prevent duplicate sends';
COMMENT ON COLUMN public.user_preferences.notification_personalized_events IS 'Receive notifications for new events matching user interests';
COMMENT ON COLUMN public.user_preferences.notification_personalized_offers IS 'Receive notifications for new offers matching user interests';
COMMENT ON COLUMN public.user_preferences.notification_boosted_content IS 'Receive notifications for boosted events/offers matching interests';
COMMENT ON COLUMN public.user_preferences.notification_expiring_offers IS 'Receive reminders before offers expire';
COMMENT ON COLUMN public.user_preferences.notification_fomo_recommendations IS 'Master toggle for personalized FOMO recommendations';