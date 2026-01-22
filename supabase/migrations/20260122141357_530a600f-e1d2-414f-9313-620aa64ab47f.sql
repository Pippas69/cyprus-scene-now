-- Update get_slots_availability to respect Accept Reservations + Global Pause
CREATE OR REPLACE FUNCTION public.get_slots_availability(
  p_business_id uuid,
  p_date date
)
RETURNS TABLE (
  slot_time text,
  time_from text,
  time_to text,
  capacity int,
  booked int,
  available int,
  is_closed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_index int;
  v_day_name text;
  v_time_slots jsonb;
  v_accepts boolean;
  v_is_paused boolean;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  v_day_index := EXTRACT(DOW FROM p_date)::int;

  -- Map to lowercase English day names (matching frontend JSON: monday..sunday)
  v_day_name := CASE v_day_index
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  SELECT
    COALESCE(b.accepts_direct_reservations, false),
    COALESCE(b.reservations_globally_paused, false),
    b.reservation_time_slots
  INTO v_accepts, v_is_paused, v_time_slots
  FROM businesses b
  WHERE b.id = p_business_id;

  -- Master switch: if business does not accept reservations OR is paused OR has no slots, return 0 rows
  IF (NOT v_accepts) OR v_is_paused OR v_time_slots IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH business_slots AS (
    SELECT
      slot->>'timeFrom' as slot_time_from,
      slot->>'timeTo' as slot_time_to,
      COALESCE((slot->>'capacity')::int, 10) as slot_capacity
    FROM jsonb_array_elements(v_time_slots) as slot
    WHERE slot->'days' ? v_day_name
  ),
  slot_bookings AS (
    SELECT
      to_char(r.preferred_time, 'HH24:MI') as booked_time,
      COUNT(*)::int as booking_count
    FROM reservations r
    WHERE r.business_id = p_business_id
      AND r.preferred_time::date = p_date
      AND r.status IN ('pending', 'accepted')
    GROUP BY to_char(r.preferred_time, 'HH24:MI')
  ),
  slot_closures AS (
    SELECT rsc.slot_time as closed_slot
    FROM reservation_slot_closures rsc
    WHERE rsc.business_id = p_business_id
      AND rsc.closure_date = p_date
  )
  SELECT
    bs.slot_time_from as slot_time,
    bs.slot_time_from as time_from,
    bs.slot_time_to as time_to,
    bs.slot_capacity as capacity,
    COALESCE(sb.booking_count, 0) as booked,
    GREATEST(0, bs.slot_capacity - COALESCE(sb.booking_count, 0)) as available,
    EXISTS(SELECT 1 FROM slot_closures sc WHERE sc.closed_slot = bs.slot_time_from) as is_closed
  FROM business_slots bs
  LEFT JOIN slot_bookings sb ON sb.booked_time = bs.slot_time_from
  ORDER BY bs.slot_time_from;
END;
$$;

-- Re-grant execute permissions (idempotent)
GRANT EXECUTE ON FUNCTION public.get_slots_availability(uuid, date) TO authenticated, anon;