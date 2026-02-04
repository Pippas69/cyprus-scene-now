-- Fix: Include the end time (timeTo) as a valid booking time
-- Changed from "< to_min" to "<= to_min" so that if a slot is 06:00-11:00,
-- the user can book at 11:00 as well.

-- Drop + recreate to safely change definitions.
DROP FUNCTION IF EXISTS public.book_slot_atomically(uuid,uuid,date,text,integer,text,text,text,text,boolean);
DROP FUNCTION IF EXISTS public.get_slot_available_capacity(uuid,date,text);
DROP FUNCTION IF EXISTS public.get_slots_availability(uuid,date);

-- 1) Slot availability per slot window (timeFrom->timeTo), using Europe/Athens
-- FIXED: Changed "< v.to_min" to "<= v.to_min" to include the end time
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
BEGIN
  v_day_index := EXTRACT(DOW FROM p_date)::int;
  v_day_name := CASE v_day_index
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  SELECT b.reservation_time_slots
  INTO v_time_slots
  FROM businesses b
  WHERE b.id = p_business_id;

  IF v_time_slots IS NULL THEN
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
  slot_closures AS (
    SELECT rsc.slot_time as closed_slot
    FROM reservation_slot_closures rsc
    WHERE rsc.business_id = p_business_id
      AND rsc.closure_date = p_date
  ),
  slot_counts AS (
    SELECT
      bs.slot_time_from,
      COUNT(r.id)::int AS booking_count
    FROM business_slots bs
    LEFT JOIN reservations r
      ON r.business_id = p_business_id
      AND r.event_id IS NULL
      AND r.status IN ('pending', 'accepted')
      AND ((r.preferred_time AT TIME ZONE 'Europe/Athens')::date = p_date)
      AND (
        WITH v AS (
          SELECT
            (split_part(bs.slot_time_from, ':', 1)::int * 60 + split_part(bs.slot_time_from, ':', 2)::int) AS from_min,
            (split_part(bs.slot_time_to, ':', 1)::int * 60 + split_part(bs.slot_time_to, ':', 2)::int) AS to_min,
            (extract(hour from (r.preferred_time AT TIME ZONE 'Europe/Athens'))::int * 60 + extract(minute from (r.preferred_time AT TIME ZONE 'Europe/Athens'))::int) AS t_min
        )
        SELECT
          CASE
            WHEN v.to_min <= v.from_min THEN
              (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) >= v.from_min
              AND (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) <= (v.to_min + 1440)
            ELSE
              v.t_min >= v.from_min AND v.t_min <= v.to_min
          END
        FROM v
      )
    GROUP BY bs.slot_time_from
  )
  SELECT
    bs.slot_time_from as slot_time,
    bs.slot_time_from as time_from,
    bs.slot_time_to as time_to,
    bs.slot_capacity as capacity,
    COALESCE(sc.booking_count, 0) as booked,
    CASE
      WHEN EXISTS(SELECT 1 FROM slot_closures scc WHERE scc.closed_slot = bs.slot_time_from) THEN 0
      ELSE GREATEST(0, bs.slot_capacity - COALESCE(sc.booking_count, 0))
    END as available,
    EXISTS(SELECT 1 FROM slot_closures scc WHERE scc.closed_slot = bs.slot_time_from) as is_closed
  FROM business_slots bs
  LEFT JOIN slot_counts sc ON sc.slot_time_from = bs.slot_time_from
  ORDER BY bs.slot_time_from;
END;
$$;

-- 2) Available capacity for a specific arrival time (p_slot_time)
-- FIXED: Changed "< v.to_min" to "<= v.to_min" to include the end time
CREATE OR REPLACE FUNCTION public.get_slot_available_capacity(
  p_business_id uuid,
  p_date date,
  p_slot_time text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_index int;
  v_day_name text;
  v_time_slots jsonb;
  v_slot_from text;
  v_slot_to text;
  v_slot_capacity int;
  v_booked_count int;
  v_arrival_min int;
  v_from_min int;
  v_to_min int;
BEGIN
  v_day_index := EXTRACT(DOW FROM p_date)::int;
  v_day_name := CASE v_day_index
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  SELECT b.reservation_time_slots
  INTO v_time_slots
  FROM businesses b
  WHERE b.id = p_business_id;

  IF v_time_slots IS NULL THEN
    RETURN 0;
  END IF;

  v_arrival_min := split_part(p_slot_time, ':', 1)::int * 60 + split_part(p_slot_time, ':', 2)::int;

  SELECT
    slot->>'timeFrom',
    slot->>'timeTo',
    COALESCE((slot->>'capacity')::int, 10)
  INTO v_slot_from, v_slot_to, v_slot_capacity
  FROM jsonb_array_elements(v_time_slots) as slot
  WHERE slot->'days' ? v_day_name
    AND (
      WITH v AS (
        SELECT
          (split_part(slot->>'timeFrom', ':', 1)::int * 60 + split_part(slot->>'timeFrom', ':', 2)::int) AS from_min,
          (split_part(slot->>'timeTo', ':', 1)::int * 60 + split_part(slot->>'timeTo', ':', 2)::int) AS to_min,
          v_arrival_min AS t_min
      )
      SELECT
        CASE
          WHEN v.to_min <= v.from_min THEN
            (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) >= v.from_min
            AND (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) <= (v.to_min + 1440)
          ELSE
            v.t_min >= v.from_min AND v.t_min <= v.to_min
        END
      FROM v
    )
  ORDER BY slot->>'timeFrom'
  LIMIT 1;

  IF v_slot_capacity IS NULL OR v_slot_from IS NULL OR v_slot_to IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reservation_slot_closures rsc
    WHERE rsc.business_id = p_business_id
      AND rsc.closure_date = p_date
      AND rsc.slot_time = v_slot_from
  ) THEN
    RETURN 0;
  END IF;

  v_from_min := split_part(v_slot_from, ':', 1)::int * 60 + split_part(v_slot_from, ':', 2)::int;
  v_to_min := split_part(v_slot_to, ':', 1)::int * 60 + split_part(v_slot_to, ':', 2)::int;

  SELECT COUNT(*)::int INTO v_booked_count
  FROM reservations r
  WHERE r.business_id = p_business_id
    AND r.event_id IS NULL
    AND r.status IN ('accepted', 'pending')
    AND ((r.preferred_time AT TIME ZONE 'Europe/Athens')::date = p_date)
    AND (
      WITH v AS (
        SELECT
          v_from_min AS from_min,
          v_to_min AS to_min,
          (extract(hour from (r.preferred_time AT TIME ZONE 'Europe/Athens'))::int * 60 + extract(minute from (r.preferred_time AT TIME ZONE 'Europe/Athens'))::int) AS t_min
      )
      SELECT
        CASE
          WHEN v.to_min <= v.from_min THEN
            (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) >= v.from_min
            AND (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) <= (v.to_min + 1440)
          ELSE
            v.t_min >= v.from_min AND v.t_min <= v.to_min
        END
      FROM v
    );

  RETURN GREATEST(0, v_slot_capacity - v_booked_count);
END;
$$;

-- 3) Atomic booking uses slot window + enforces maxPartySize from JSON (defaults to 50)
-- FIXED: Changed "< v.to_min" to "<= v.to_min" to include the end time
CREATE OR REPLACE FUNCTION public.book_slot_atomically(
    p_business_id uuid,
    p_user_id uuid,
    p_date date,
    p_slot_time text,
    p_party_size integer,
    p_reservation_name text,
    p_phone_number text DEFAULT NULL,
    p_seating_preference text DEFAULT NULL,
    p_special_requests text DEFAULT NULL,
    p_is_offer_based boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_available integer;
    v_reservation_id uuid;
    v_confirmation_code text;
    v_qr_token text;
    v_preferred_time timestamp with time zone;
    v_day_index int;
    v_day_name text;
    v_time_slots jsonb;
    v_slot_from text;
    v_slot_to text;
    v_slot_max_party int;
    v_arrival_min int;
BEGIN
    v_day_index := EXTRACT(DOW FROM p_date)::int;
    v_day_name := CASE v_day_index
      WHEN 0 THEN 'sunday'
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
    END;

    SELECT b.reservation_time_slots
    INTO v_time_slots
    FROM businesses b
    WHERE b.id = p_business_id;

    IF v_time_slots IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'NO_SLOTS', 'message', 'No slots configured');
    END IF;

    v_arrival_min := split_part(p_slot_time, ':', 1)::int * 60 + split_part(p_slot_time, ':', 2)::int;

    SELECT
      slot->>'timeFrom',
      slot->>'timeTo',
      COALESCE((slot->>'maxPartySize')::int, 50)
    INTO v_slot_from, v_slot_to, v_slot_max_party
    FROM jsonb_array_elements(v_time_slots) as slot
    WHERE slot->'days' ? v_day_name
      AND (
        WITH v AS (
          SELECT
            (split_part(slot->>'timeFrom', ':', 1)::int * 60 + split_part(slot->>'timeFrom', ':', 2)::int) AS from_min,
            (split_part(slot->>'timeTo', ':', 1)::int * 60 + split_part(slot->>'timeTo', ':', 2)::int) AS to_min,
            v_arrival_min AS t_min
        )
        SELECT
          CASE
            WHEN v.to_min <= v.from_min THEN
              (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) >= v.from_min
              AND (CASE WHEN v.t_min < v.from_min THEN v.t_min + 1440 ELSE v.t_min END) <= (v.to_min + 1440)
            ELSE
              v.t_min >= v.from_min AND v.t_min <= v.to_min
          END
        FROM v
      )
    ORDER BY slot->>'timeFrom'
    LIMIT 1;

    IF v_slot_from IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'TIME_NOT_IN_SLOT', 'message', 'Selected time is not within any slot');
    END IF;

    IF p_party_size > v_slot_max_party THEN
      RETURN jsonb_build_object('success', false, 'error', 'PARTY_TOO_LARGE', 'message', 'Party size exceeds max allowed for this slot', 'max_party_size', v_slot_max_party);
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(p_business_id::text || p_date::text || v_slot_from));

    v_available := get_slot_available_capacity(p_business_id, p_date, p_slot_time);

    IF v_available < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'SLOT_FULL', 'message', 'This slot is no longer available');
    END IF;

    v_confirmation_code := UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
    v_qr_token := 'RES-' || gen_random_uuid()::text;

    v_preferred_time := (p_date::text || ' ' || p_slot_time)::timestamp AT TIME ZONE 'Europe/Athens';

    INSERT INTO reservations (
        business_id,
        user_id,
        reservation_name,
        party_size,
        preferred_time,
        phone_number,
        seating_preference,
        special_requests,
        status,
        confirmation_code,
        qr_code_token
    ) VALUES (
        p_business_id,
        p_user_id,
        p_reservation_name,
        p_party_size,
        v_preferred_time,
        p_phone_number,
        p_seating_preference,
        p_special_requests,
        'accepted',
        v_confirmation_code,
        v_qr_token
    )
    RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'confirmation_code', v_confirmation_code,
        'qr_token', v_qr_token,
        'preferred_time', v_preferred_time,
        'slot_time_from', v_slot_from,
        'max_party_size', v_slot_max_party
    );
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_slot_available_capacity TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.book_slot_atomically TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slots_availability TO authenticated, anon;