
-- =============================================================
-- FIX 1: Atomic ticket reservation function with advisory lock
-- Prevents overselling when 2 users buy the last ticket simultaneously
-- =============================================================

CREATE OR REPLACE FUNCTION public.reserve_tickets_atomically(
    p_tier_id uuid,
    p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tier record;
    v_available integer;
BEGIN
    -- Advisory lock on the tier to serialize concurrent requests
    PERFORM pg_advisory_xact_lock(hashtext('ticket_tier_' || p_tier_id::text));

    -- Get fresh tier data inside the lock
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

    -- Atomically increment quantity_sold
    UPDATE ticket_tiers
    SET quantity_sold = quantity_sold + p_quantity
    WHERE id = p_tier_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_quantity_sold', v_tier.quantity_sold + p_quantity,
        'remaining', v_available - p_quantity
    );
END;
$$;

-- Reverse operation: release reserved tickets (e.g. payment failed/cancelled)
CREATE OR REPLACE FUNCTION public.release_tickets(
    p_tier_id uuid,
    p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('ticket_tier_' || p_tier_id::text));
    
    UPDATE ticket_tiers
    SET quantity_sold = GREATEST(0, quantity_sold - p_quantity)
    WHERE id = p_tier_id;
END;
$$;

-- =============================================================
-- FIX 2: Atomic check-in function for tickets
-- Uses UPDATE ... WHERE status = 'valid' RETURNING to prevent double check-in
-- =============================================================

CREATE OR REPLACE FUNCTION public.atomic_ticket_checkin(
    p_ticket_id uuid,
    p_staff_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        -- Check why it failed
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

-- Atomic check-in for reservations (same pattern)
CREATE OR REPLACE FUNCTION public.atomic_reservation_checkin(
    p_reservation_id uuid,
    p_staff_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reserve_tickets_atomically TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_tickets TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atomic_ticket_checkin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atomic_reservation_checkin TO authenticated, service_role;
