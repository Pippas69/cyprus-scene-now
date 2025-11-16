-- Create updated_at handler function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_preferences table to store user-specific settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_notifications_enabled BOOLEAN DEFAULT true,
  notification_event_reminders BOOLEAN DEFAULT true,
  notification_reservations BOOLEAN DEFAULT true,
  notification_rsvp_updates BOOLEAN DEFAULT true,
  notification_new_events BOOLEAN DEFAULT true,
  notification_business_updates BOOLEAN DEFAULT false,
  default_city TEXT,
  theme_preference TEXT DEFAULT 'system',
  profile_visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to automatically create user preferences
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create preferences for existing users
CREATE OR REPLACE FUNCTION public.create_preferences_for_existing_users()
RETURNS void AS $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.user_preferences (user_id)
    VALUES (profile_record.id)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Execute function to create preferences for existing users
SELECT public.create_preferences_for_existing_users();

-- Create trigger for new users (will fire when new profile is created)
CREATE TRIGGER on_profile_created_create_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_preferences();

-- Create updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();