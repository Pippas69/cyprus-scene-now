-- Fix: Only count accepted reservations for availability (not pending)
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
   AND r.status = 'accepted'
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

-- Clean up orphaned pending reservations (cancel them, keep prepaid_charge_status as pending since 'failed' is not allowed)
UPDATE public.reservations
SET status = 'cancelled'
WHERE status = 'pending'
  AND prepaid_charge_status = 'pending'
  AND event_id IS NOT NULL
  AND seating_type_id IS NOT NULL
  AND stripe_payment_intent_id IS NULL;