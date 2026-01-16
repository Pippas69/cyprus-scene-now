-- Allow a user to mark both "interested" and "going" for the same event by making the uniqueness include status.
-- Existing constraint name seen in logs: rsvps_event_id_user_id_key

ALTER TABLE public.rsvps
  DROP CONSTRAINT IF EXISTS rsvps_event_id_user_id_key;

-- Prevent duplicates per status
ALTER TABLE public.rsvps
  ADD CONSTRAINT rsvps_event_id_user_id_status_key UNIQUE (event_id, user_id, status);
