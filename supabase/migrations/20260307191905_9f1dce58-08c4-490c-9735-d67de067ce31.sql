-- Aggregate reservation counts per seating type for an event.
-- SECURITY DEFINER ensures all users get consistent availability numbers
-- without exposing reservation row-level personal data.
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
    ON r.seating_type_id = st.id
   AND r.event_id = p_event_id
   AND r.status IN ('pending', 'accepted')
  WHERE st.event_id = p_event_id
  GROUP BY st.id
$$;

GRANT EXECUTE ON FUNCTION public.get_event_seating_booked_counts(uuid) TO anon, authenticated;