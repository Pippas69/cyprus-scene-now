-- Fix RSVP logic: one RSVP per user per event (mutually exclusive) + dedupe existing rows

-- 1) Dedupe data (keep GOING if both exist; otherwise keep most recent)
WITH ranked AS (
  SELECT
    ctid,
    event_id,
    user_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY event_id, user_id
      ORDER BY (status = 'going') DESC, created_at DESC
    ) AS rn
  FROM public.rsvps
)
DELETE FROM public.rsvps r
USING ranked x
WHERE r.ctid = x.ctid
  AND x.rn > 1;

-- 2) Enforce constraint: only one row per (event_id, user_id)
ALTER TABLE public.rsvps
  DROP CONSTRAINT IF EXISTS rsvps_event_id_user_id_status_key;

ALTER TABLE public.rsvps
  ADD CONSTRAINT rsvps_event_id_user_id_key UNIQUE (event_id, user_id);

-- 3) Make count RPCs resilient (distinct users) and consistent across app
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