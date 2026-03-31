
ALTER TABLE public.user_preferences
  ALTER COLUMN notification_event_reminders SET DEFAULT false,
  ALTER COLUMN notification_reservations SET DEFAULT false,
  ALTER COLUMN notification_expiring_offers SET DEFAULT false,
  ALTER COLUMN notification_push_enabled SET DEFAULT true;
