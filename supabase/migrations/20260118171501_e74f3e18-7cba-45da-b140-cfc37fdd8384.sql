-- =============================================
-- UNIFIED SLOT-BASED RESERVATION SYSTEM
-- =============================================

-- 1. Add new columns to businesses table for enhanced slot management
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS reservations_globally_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reservation_no_show_count integer DEFAULT 0;

-- 2. Create table for tracking slot closures (when staff manually closes slots)
CREATE TABLE IF NOT EXISTS public.reservation_slot_closures (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    closure_date date NOT NULL,
    slot_time text NOT NULL, -- The start time of the slot being closed (e.g., "18:00")
    closed_by uuid REFERENCES auth.users(id),
    reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_slot_closures_business_date 
ON public.reservation_slot_closures(business_id, closure_date);

-- Enable RLS
ALTER TABLE public.reservation_slot_closures ENABLE ROW LEVEL SECURITY;

-- RLS policies for slot closures
CREATE POLICY "Business owners can manage their slot closures"
ON public.reservation_slot_closures
FOR ALL
USING (
    business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view slot closures for booking"
ON public.reservation_slot_closures
FOR SELECT
USING (true);

-- 3. Create table for tracking user no-shows (for penalty system)
CREATE TABLE IF NOT EXISTS public.reservation_no_shows (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    no_show_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_no_shows_user ON public.reservation_no_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_no_shows_business ON public.reservation_no_shows(business_id);

ALTER TABLE public.reservation_no_shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their no-shows"
ON public.reservation_no_shows
FOR SELECT
USING (
    business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their own no-shows"
ON public.reservation_no_shows
FOR SELECT
USING (user_id = auth.uid());

-- 4. Update get_business_available_capacity function to use new slot system
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
    v_slot_capacity integer;
    v_booked_count integer;
    v_is_closed boolean;
    v_is_paused boolean;
    v_time_slots jsonb;
BEGIN
    -- Check if reservations are globally paused
    SELECT reservations_globally_paused INTO v_is_paused
    FROM businesses
    WHERE id = p_business_id;
    
    IF v_is_paused THEN
        RETURN 0;
    END IF;

    -- Check if this specific slot is manually closed
    SELECT EXISTS(
        SELECT 1 FROM reservation_slot_closures
        WHERE business_id = p_business_id
        AND closure_date = p_date
        AND slot_time = p_slot_time
    ) INTO v_is_closed;
    
    IF v_is_closed THEN
        RETURN 0;
    END IF;

    -- Get the slot capacity from business settings
    SELECT reservation_time_slots INTO v_time_slots
    FROM businesses
    WHERE id = p_business_id;
    
    -- Find the capacity for this specific slot time
    SELECT (slot->>'capacity')::integer INTO v_slot_capacity
    FROM jsonb_array_elements(v_time_slots) AS slot
    WHERE slot->>'time' = p_slot_time;
    
    IF v_slot_capacity IS NULL THEN
        RETURN 0;
    END IF;

    -- Count existing accepted/pending reservations for this slot
    -- Match reservations where preferred_time falls within this slot's time window
    SELECT COUNT(*) INTO v_booked_count
    FROM reservations r
    WHERE r.business_id = p_business_id
    AND r.event_id IS NULL  -- Only direct/offer reservations
    AND r.status IN ('accepted', 'pending')
    AND DATE(r.preferred_time) = p_date
    AND TO_CHAR(r.preferred_time, 'HH24:MI') = p_slot_time;
    
    RETURN GREATEST(0, v_slot_capacity - v_booked_count);
END;
$$;

-- 5. Function to check if a slot is available and book atomically
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
BEGIN
    -- Lock to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext(p_business_id::text || p_date::text || p_slot_time));
    
    -- Check availability
    v_available := get_slot_available_capacity(p_business_id, p_date, p_slot_time);
    
    IF v_available < 1 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SLOT_FULL',
            'message', 'This slot is no longer available'
        );
    END IF;
    
    -- Generate confirmation code and QR token
    v_confirmation_code := UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
    v_qr_token := 'RES-' || gen_random_uuid()::text;
    
    -- Build the preferred_time timestamp
    v_preferred_time := (p_date::text || ' ' || p_slot_time)::timestamp AT TIME ZONE 'Europe/Athens';
    
    -- Create the reservation with status 'accepted' (instant confirmation)
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
        'accepted',  -- Instant confirmation!
        v_confirmation_code,
        v_qr_token
    )
    RETURNING id INTO v_reservation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'confirmation_code', v_confirmation_code,
        'qr_token', v_qr_token,
        'preferred_time', v_preferred_time
    );
END;
$$;

-- 6. Function to cancel expired reservations (no check-in within 15 minutes)
CREATE OR REPLACE FUNCTION public.cancel_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer := 0;
    v_reservation RECORD;
BEGIN
    -- Find reservations that are past their slot time + 15 minutes grace period
    -- and haven't been checked in
    FOR v_reservation IN
        SELECT r.id, r.user_id, r.business_id
        FROM reservations r
        WHERE r.status = 'accepted'
        AND r.checked_in_at IS NULL
        AND r.event_id IS NULL  -- Only direct/offer reservations
        AND r.preferred_time < (NOW() - INTERVAL '15 minutes')
    LOOP
        -- Update to cancelled
        UPDATE reservations
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = v_reservation.id;
        
        -- Record the no-show
        INSERT INTO reservation_no_shows (user_id, reservation_id, business_id)
        VALUES (v_reservation.user_id, v_reservation.id, v_reservation.business_id);
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- 7. Function to get all slots with their availability for a specific date
CREATE OR REPLACE FUNCTION public.get_slots_availability(
    p_business_id uuid,
    p_date date
)
RETURNS TABLE (
    slot_time text,
    capacity integer,
    booked integer,
    available integer,
    is_closed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_time_slots jsonb;
    v_is_paused boolean;
BEGIN
    -- Check if reservations are globally paused
    SELECT reservations_globally_paused, reservation_time_slots 
    INTO v_is_paused, v_time_slots
    FROM businesses
    WHERE id = p_business_id;
    
    IF v_is_paused OR v_time_slots IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        (slot->>'time')::text AS slot_time,
        (slot->>'capacity')::integer AS capacity,
        COALESCE((
            SELECT COUNT(*)::integer
            FROM reservations r
            WHERE r.business_id = p_business_id
            AND r.event_id IS NULL
            AND r.status IN ('accepted', 'pending')
            AND DATE(r.preferred_time) = p_date
            AND TO_CHAR(r.preferred_time, 'HH24:MI') = slot->>'time'
        ), 0) AS booked,
        GREATEST(0, (slot->>'capacity')::integer - COALESCE((
            SELECT COUNT(*)::integer
            FROM reservations r
            WHERE r.business_id = p_business_id
            AND r.event_id IS NULL
            AND r.status IN ('accepted', 'pending')
            AND DATE(r.preferred_time) = p_date
            AND TO_CHAR(r.preferred_time, 'HH24:MI') = slot->>'time'
        ), 0))::integer AS available,
        EXISTS(
            SELECT 1 FROM reservation_slot_closures rsc
            WHERE rsc.business_id = p_business_id
            AND rsc.closure_date = p_date
            AND rsc.slot_time = slot->>'time'
        ) AS is_closed
    FROM jsonb_array_elements(v_time_slots) AS slot
    ORDER BY slot->>'time';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_slot_available_capacity TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.book_slot_atomically TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_expired_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slots_availability TO authenticated, anon;