
-- =============================================================
-- FIX 1: Add lock_timeout to ALL atomic functions
-- Prevents indefinite waits during peak load
-- =============================================================

-- Ticket reservation with 5s lock timeout
CREATE OR REPLACE FUNCTION public.reserve_tickets_atomically(
    p_tier_id uuid,
    p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '5s'
AS $$
DECLARE
    v_tier record;
    v_available integer;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('ticket_tier_' || p_tier_id::text));

    SELECT quantity_total, quantity_sold, active, name
    INTO v_tier
    FROM ticket_tiers
    WHERE id = p_tier_id;

    IF v_tier IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'TIER_NOT_FOUND', 'message', 'Ticket tier not found');
    END IF;

    IF NOT v_tier.active THEN
        RETURN jsonb_build_object('success', false, 'error', 'TIER_INACTIVE', 'message', 'Ticket tier is no longer active');
    END IF;

    v_available := v_tier.quantity_total - v_tier.quantity_sold;

    IF p_quantity > v_available THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_TICKETS',
            'message', 'Not enough tickets available for ' || v_tier.name || '. Only ' || v_available || ' left.',
            'available', v_available
        );
    END IF;

    UPDATE ticket_tiers
    SET quantity_sold = quantity_sold + p_quantity
    WHERE id = p_tier_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_quantity_sold', v_tier.quantity_sold + p_quantity,
        'remaining', v_available - p_quantity
    );
EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'LOCK_TIMEOUT', 'message', 'Server busy, please try again');
END;
$$;

-- Release tickets with lock timeout
CREATE OR REPLACE FUNCTION public.release_tickets(
    p_tier_id uuid,
    p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '5s'
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('ticket_tier_' || p_tier_id::text));
    
    UPDATE ticket_tiers
    SET quantity_sold = GREATEST(0, quantity_sold - p_quantity)
    WHERE id = p_tier_id;
EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'Lock timeout while releasing tickets';
END;
$$;

-- Atomic ticket check-in (no advisory lock needed - uses UPDATE WHERE)
CREATE OR REPLACE FUNCTION public.atomic_ticket_checkin(
    p_ticket_id uuid,
    p_staff_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
AS $$
DECLARE
    v_updated_id uuid;
    v_checked_in_at timestamptz;
BEGIN
    v_checked_in_at := now();
    
    UPDATE tickets
    SET status = 'used',
        checked_in_at = v_checked_in_at,
        checked_in_by = p_staff_user_id
    WHERE id = p_ticket_id
      AND status = 'valid'
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        PERFORM 1 FROM tickets WHERE id = p_ticket_id AND status = 'used';
        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'ALREADY_USED', 'message', 'Ticket already checked in');
        END IF;
        
        PERFORM 1 FROM tickets WHERE id = p_ticket_id AND status IN ('cancelled', 'refunded');
        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Ticket is cancelled or refunded');
        END IF;
        
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Ticket not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'checked_in_at', v_checked_in_at);
END;
$$;

-- Atomic reservation check-in
CREATE OR REPLACE FUNCTION public.atomic_reservation_checkin(
    p_reservation_id uuid,
    p_staff_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
AS $$
DECLARE
    v_updated_id uuid;
    v_checked_in_at timestamptz;
BEGIN
    v_checked_in_at := now();
    
    UPDATE reservations
    SET checked_in_at = v_checked_in_at,
        checked_in_by = p_staff_user_id
    WHERE id = p_reservation_id
      AND checked_in_at IS NULL
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        PERFORM 1 FROM reservations WHERE id = p_reservation_id AND checked_in_at IS NOT NULL;
        IF FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CHECKED_IN', 'message', 'Reservation already checked in');
        END IF;
        
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Reservation not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'checked_in_at', v_checked_in_at);
END;
$$;

-- Offer spots claim with lock timeout
CREATE OR REPLACE FUNCTION public.claim_offer_spots_atomically(
    p_discount_id uuid,
    p_party_size integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '5s'
AS $$
DECLARE
    v_remaining integer;
    v_total integer;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('discount_' || p_discount_id::text));

    SELECT people_remaining, total_people
    INTO v_remaining, v_total
    FROM discounts
    WHERE id = p_discount_id;

    IF v_remaining IS NULL THEN
        RETURN jsonb_build_object('success', true, 'remaining', -1);
    END IF;

    IF v_remaining < p_party_size THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Not enough spots remaining. Only ' || v_remaining || ' left.',
            'remaining', v_remaining
        );
    END IF;

    UPDATE discounts
    SET people_remaining = people_remaining - p_party_size
    WHERE id = p_discount_id;

    RETURN jsonb_build_object(
        'success', true,
        'remaining', v_remaining - p_party_size
    );
EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'LOCK_TIMEOUT', 'message', 'Server busy, please try again');
END;
$$;

-- Release offer spots with lock timeout
CREATE OR REPLACE FUNCTION public.release_offer_spots(
    p_discount_id uuid,
    p_party_size integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '5s'
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('discount_' || p_discount_id::text));
    
    UPDATE discounts
    SET people_remaining = LEAST(
        COALESCE(total_people, people_remaining + p_party_size),
        COALESCE(people_remaining, 0) + p_party_size
    )
    WHERE id = p_discount_id
      AND people_remaining IS NOT NULL;
EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'Lock timeout while releasing offer spots';
END;
$$;

-- Make webhook_events_processed use UNIQUE constraint for proper ON CONFLICT
-- Already has PRIMARY KEY on stripe_event_id, which supports ON CONFLICT

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reserve_tickets_atomically TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_tickets TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atomic_ticket_checkin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atomic_reservation_checkin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_offer_spots_atomically TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_offer_spots TO authenticated, service_role;
