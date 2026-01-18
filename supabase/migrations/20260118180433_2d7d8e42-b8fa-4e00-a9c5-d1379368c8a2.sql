
-- Fix the get_slots_availability function to use consistent English day names
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
AS $$
DECLARE
  v_day_index int;
  v_day_name text;
  v_time_slots jsonb;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  v_day_index := EXTRACT(DOW FROM p_date)::int;
  
  -- Map to lowercase English day names (matching frontend)
  v_day_name := CASE v_day_index
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;
  
  -- Get the time slots configuration from the business
  SELECT b.reservation_time_slots INTO v_time_slots
  FROM businesses b
  WHERE b.id = p_business_id;
  
  -- If no time slots configured, return empty
  IF v_time_slots IS NULL THEN
    RETURN;
  END IF;
  
  -- Return each slot with its availability
  RETURN QUERY
  WITH business_slots AS (
    SELECT 
      slot->>'timeFrom' as slot_time_from,
      slot->>'timeTo' as slot_time_to,
      COALESCE((slot->>'capacity')::int, 10) as slot_capacity,
      slot->'days' as slot_days
    FROM jsonb_array_elements(v_time_slots) as slot
    WHERE slot->'days' ? v_day_name
  ),
  slot_bookings AS (
    SELECT 
      dr.reservation_time as booked_time,
      COUNT(*)::int as booking_count
    FROM direct_reservations dr
    WHERE dr.business_id = p_business_id
      AND DATE(dr.reservation_date) = p_date
      AND dr.status IN ('pending', 'accepted')
    GROUP BY dr.reservation_time
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
