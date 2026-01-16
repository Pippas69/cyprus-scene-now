-- Allow both interested AND going per user/event (2 rows max)

-- 1) Drop existing single-row constraint
ALTER TABLE public.rsvps
  DROP CONSTRAINT IF EXISTS rsvps_event_id_user_id_key;

-- 2) Restore constraint allowing both statuses (unique per event, user, status)
ALTER TABLE public.rsvps
  ADD CONSTRAINT rsvps_event_id_user_id_status_key UNIQUE (event_id, user_id, status);

-- 3) Update RPCs: count distinct users per status
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
    (SELECT count(DISTINCT r.user_id) FROM public.rsvps r WHERE r.event_id = p_event_id AND r.status = 'interested') AS interested_count,
    (SELECT count(DISTINCT r.user_id) FROM public.rsvps r WHERE r.event_id = p_event_id AND r.status = 'going') AS going_count;
$$;

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
    COUNT(DISTINCT r.user_id) FILTER (WHERE r.status = 'interested') AS interested_count,
    COUNT(DISTINCT r.user_id) FILTER (WHERE r.status = 'going') AS going_count
  FROM public.rsvps r
  WHERE r.event_id = ANY(p_event_ids)
  GROUP BY r.event_id;
$$;