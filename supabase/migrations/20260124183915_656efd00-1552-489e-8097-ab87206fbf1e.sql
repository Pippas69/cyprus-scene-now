-- Add deep_link and event_type columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS deep_link TEXT,
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries by event_type
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON public.notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;