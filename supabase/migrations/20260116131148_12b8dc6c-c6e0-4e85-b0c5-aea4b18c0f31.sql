-- Expand engagement_events.event_type CHECK constraint to include all app-tracked event types
DO $$
BEGIN
  -- Drop existing constraint if present
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'engagement_events_event_type_check'
  ) THEN
    ALTER TABLE public.engagement_events DROP CONSTRAINT engagement_events_event_type_check;
  END IF;

  -- Recreate with the full allowed set used by the app
  ALTER TABLE public.engagement_events
  ADD CONSTRAINT engagement_events_event_type_check
  CHECK (
    event_type IN (
      'profile_view',
      'website_click',
      'phone_click',
      'share',
      'favorite',
      'unfavorite',
      'follow',
      'save',
      'check_in',
      'event_check_in',
      'offer_redeem_click'
    )
  );
END $$;