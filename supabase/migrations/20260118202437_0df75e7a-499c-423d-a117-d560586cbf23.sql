-- Drop old function first, then recreate
DROP FUNCTION IF EXISTS get_slot_available_capacity(uuid, date, text);

CREATE FUNCTION get_slot_available_capacity(
  p_business_id uuid,
  p_date date,
  p_time_from text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business record;
  v_day_name text;
  v_slot_capacity integer := 0;
  v_existing_count integer := 0;
  v_time_start time;
  v_time_end time;
BEGIN
  -- Get business reservation settings
  SELECT 
    accepts_direct_reservations,
    reservation_capacity_type,
    daily_reservation_limit,
    reservation_time_slots,
    reservation_days
  INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  -- Check if business accepts reservations
  IF NOT COALESCE(v_business.accepts_direct_reservations, false) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'No reservations', 'remaining_capacity', 0);
  END IF;

  -- Get day name from date
  v_day_name := lower(to_char(p_date, 'fmDay'));

  -- Check if day is valid
  IF v_business.reservation_days IS NOT NULL AND NOT (v_day_name = ANY(v_business.reservation_days)) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Closed on this day', 'remaining_capacity', 0);
  END IF;

  -- For time_slots capacity type, find the matching slot
  IF v_business.reservation_capacity_type = 'time_slots' AND v_business.reservation_time_slots IS NOT NULL THEN
    -- Find the slot that contains this time
    SELECT 
      COALESCE((slot->>'capacity')::int, 10),
      (slot->>'timeFrom')::time,
      (slot->>'timeTo')::time
    INTO v_slot_capacity, v_time_start, v_time_end
    FROM jsonb_array_elements(v_business.reservation_time_slots) AS slot
    WHERE slot->'days' ? v_day_name
      AND (slot->>'timeFrom')::time <= p_time_from::time
      AND (
        CASE 
          WHEN (slot->>'timeTo')::time <= (slot->>'timeFrom')::time 
          THEN p_time_from::time < '24:00'::time OR p_time_from::time < (slot->>'timeTo')::time
          ELSE p_time_from::time < (slot->>'timeTo')::time
        END
      )
    LIMIT 1;

    IF v_slot_capacity IS NULL OR v_slot_capacity = 0 THEN
      RETURN jsonb_build_object('available', false, 'reason', 'No slot for this time', 'remaining_capacity', 0);
    END IF;

    -- Count existing reservations for this date within this time window
    SELECT COUNT(*)
    INTO v_existing_count
    FROM reservations
    WHERE business_id = p_business_id
      AND DATE(preferred_time) = p_date
      AND (preferred_time::time) >= v_time_start
      AND (
        CASE 
          WHEN v_time_end <= v_time_start 
          THEN (preferred_time::time) < '24:00'::time OR (preferred_time::time) < v_time_end
          ELSE (preferred_time::time) < v_time_end
        END
      )
      AND status NOT IN ('cancelled', 'declined');

    RETURN jsonb_build_object(
      'available', true,
      'capacity_type', 'time_slots',
      'total_capacity', v_slot_capacity,
      'used_capacity', v_existing_count,
      'remaining_capacity', GREATEST(0, v_slot_capacity - v_existing_count)
    );
  ELSE
    -- Daily capacity fallback
    SELECT COUNT(*)
    INTO v_existing_count
    FROM reservations
    WHERE business_id = p_business_id
      AND DATE(preferred_time) = p_date
      AND status NOT IN ('cancelled', 'declined');

    v_slot_capacity := COALESCE(v_business.daily_reservation_limit, 50);

    RETURN jsonb_build_object(
      'available', true,
      'capacity_type', 'daily',
      'total_capacity', v_slot_capacity,
      'used_capacity', v_existing_count,
      'remaining_capacity', GREATEST(0, v_slot_capacity - v_existing_count)
    );
  END IF;
END;
$$;