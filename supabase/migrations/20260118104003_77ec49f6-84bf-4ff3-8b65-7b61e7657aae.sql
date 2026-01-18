-- Allow generic click interactions in engagement_events (used for event card clicks)
ALTER TABLE public.engagement_events
  DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;

ALTER TABLE public.engagement_events
  ADD CONSTRAINT engagement_events_event_type_check
  CHECK (
    event_type = ANY (
      ARRAY[
        'profile_view'::text,
        'website_click'::text,
        'phone_click'::text,
        'share'::text,
        'favorite'::text,
        'unfavorite'::text,
        'follow'::text,
        'save'::text,
        'check_in'::text,
        'event_check_in'::text,
        'offer_redeem_click'::text,
        'profile_click'::text,
        'click'::text
      ]
    )
  );