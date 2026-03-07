-- Unify seating occupancy counting logic for all clients (business + user)
-- Includes legacy reservations that stored seating_preference without seating_type_id.
CREATE OR REPLACE FUNCTION public.get_event_seating_booked_counts(p_event_id uuid)
RETURNS TABLE (
  seating_type_id uuid,
  slots_booked bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    st.id AS seating_type_id,
    COALESCE(COUNT(r.id), 0)::bigint AS slots_booked
  FROM public.reservation_seating_types st
  LEFT JOIN public.reservations r
    ON r.event_id = p_event_id
   AND r.status IN ('pending', 'accepted')
   AND (
     r.seating_type_id = st.id
     OR (
       r.seating_type_id IS NULL
       AND r.seating_preference IS NOT NULL
       AND lower(trim(r.seating_preference)) = lower(trim(st.seating_type))
     )
   )
  WHERE st.event_id = p_event_id
  GROUP BY st.id
$$;

GRANT EXECUTE ON FUNCTION public.get_event_seating_booked_counts(uuid) TO anon, authenticated;

-- Keep the broader seating availability RPC aligned with the exact same counting rules.
CREATE OR REPLACE FUNCTION public.get_event_seating_availability(p_event_id uuid)
RETURNS TABLE(
  seating_type_id uuid,
  seating_type text,
  available_slots integer,
  slots_booked integer,
  remaining_slots integer,
  dress_code text,
  min_price_cents integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH booked AS (
    SELECT b.seating_type_id, b.slots_booked::integer AS slots_booked
    FROM public.get_event_seating_booked_counts(p_event_id) b
  )
  SELECT
    st.id AS seating_type_id,
    st.seating_type,
    st.available_slots,
    COALESCE(b.slots_booked, 0) AS slots_booked,
    GREATEST(0, st.available_slots - COALESCE(b.slots_booked, 0)) AS remaining_slots,
    st.dress_code,
    MIN(tt.prepaid_min_charge_cents)::integer AS min_price_cents
  FROM public.reservation_seating_types st
  LEFT JOIN booked b ON b.seating_type_id = st.id
  LEFT JOIN public.seating_type_tiers tt ON tt.seating_type_id = st.id
  WHERE st.event_id = p_event_id
  GROUP BY st.id, st.seating_type, st.available_slots, st.dress_code, b.slots_booked
$$;

GRANT EXECUTE ON FUNCTION public.get_event_seating_availability(uuid) TO anon, authenticated;