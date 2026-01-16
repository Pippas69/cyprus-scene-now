-- Public RPC to get global RSVP counts per event without exposing user identities.
-- Uses SECURITY DEFINER so it can read all rows even when RLS restricts SELECT.

CREATE OR REPLACE FUNCTION public.get_event_rsvp_counts(p_event_id uuid)
RETURNS TABLE (
  interested_count bigint,
  going_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.rsvps r WHERE r.event_id = p_event_id AND r.status = 'interested') AS interested_count,
    (SELECT count(*) FROM public.rsvps r WHERE r.event_id = p_event_id AND r.status = 'going') AS going_count;
$$;

REVOKE ALL ON FUNCTION public.get_event_rsvp_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_counts(uuid) TO anon, authenticated;
