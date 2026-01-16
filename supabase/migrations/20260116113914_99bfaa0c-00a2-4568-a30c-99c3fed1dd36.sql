-- Bulk RSVP counts for many events in one call (keeps UI consistent and fast)

CREATE OR REPLACE FUNCTION public.get_event_rsvp_counts_bulk(p_event_ids uuid[])
RETURNS TABLE (
  event_id uuid,
  interested_count bigint,
  going_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.event_id,
    COUNT(*) FILTER (WHERE r.status = 'interested') AS interested_count,
    COUNT(*) FILTER (WHERE r.status = 'going') AS going_count
  FROM public.rsvps r
  WHERE r.event_id = ANY(p_event_ids)
  GROUP BY r.event_id;
$$;

REVOKE ALL ON FUNCTION public.get_event_rsvp_counts_bulk(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_counts_bulk(uuid[]) TO anon, authenticated;
