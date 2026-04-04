CREATE OR REPLACE FUNCTION public.book_slot_atomically(
    p_business_id uuid,
    p_date date,
    p_slot_time text,
    p_party_size int,
    p_reservation_name text,
    p_phone_number text DEFAULT NULL,
    p_seating_preference text DEFAULT NULL,
    p_special_requests text DEFAULT NULL,
    p_is_offer_based boolean DEFAULT false,
    p_source text DEFAULT 'profile'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'User must be authenticated');
    END IF;

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
        qr_code_token,
        source
    ) VALUES (
        p_business_id,
        v_user_id,
        p_reservation_name,
        p_party_size,
        v_preferred_time,
        p_phone_number,
        p_seating_preference,
        p_special_requests,
        'accepted',
        v_confirmation_code,
        v_qr_token,
        COALESCE(p_source, 'profile')
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