-- Ensure event reservation capacity is computed consistently for all users.
CREATE OR REPLACE FUNCTION public.get_available_capacity(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  max_cap INTEGER;
  current_count INTEGER;
BEGIN
  SELECT max_reservations INTO max_cap
  FROM events
  WHERE id = p_event_id;

  IF max_cap IS NULL THEN
    RETURN 999999;
  END IF;

  SELECT COALESCE(SUM(party_size), 0) INTO current_count
  FROM reservations
  WHERE event_id = p_event_id
    AND status IN ('pending', 'accepted');

  RETURN GREATEST(0, max_cap - current_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_available_capacity(uuid) TO anon, authenticated;

-- Ensure seating availability is derived from live reservations (not stale counters).
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rst.id AS seating_type_id,
    rst.seating_type,
    rst.available_slots,
    COALESCE(COUNT(r.id), 0)::integer AS slots_booked,
    GREATEST(0, rst.available_slots - COALESCE(COUNT(r.id), 0)::integer) AS remaining_slots,
    rst.dress_code,
    MIN(stt.prepaid_min_charge_cents)::integer AS min_price_cents
  FROM reservation_seating_types rst
  LEFT JOIN seating_type_tiers stt
    ON stt.seating_type_id = rst.id
  LEFT JOIN reservations r
    ON r.seating_type_id = rst.id
   AND r.event_id = p_event_id
   AND r.status IN ('pending', 'accepted')
  WHERE rst.event_id = p_event_id
  GROUP BY rst.id, rst.seating_type, rst.available_slots, rst.dress_code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_seating_availability(uuid) TO anon, authenticated;