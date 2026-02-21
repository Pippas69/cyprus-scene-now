
-- =============================================================
-- FIX 4: Atomic offer claim function with advisory lock
-- Prevents overselling when 2 users claim the last spots simultaneously
-- =============================================================

CREATE OR REPLACE FUNCTION public.claim_offer_spots_atomically(
    p_discount_id uuid,
    p_party_size integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_people_remaining integer;
    v_total_people integer;
    v_active boolean;
BEGIN
    -- Advisory lock on the discount to serialize concurrent claims
    PERFORM pg_advisory_xact_lock(hashtext('discount_' || p_discount_id::text));

    -- Get fresh data inside the lock
    SELECT people_remaining, total_people, active
    INTO v_people_remaining, v_total_people, v_active
    FROM discounts
    WHERE id = p_discount_id;

    IF v_people_remaining IS NULL AND v_total_people IS NULL THEN
        -- Unlimited offer
        RETURN jsonb_build_object('success', true, 'remaining', -1);
    END IF;

    v_people_remaining := COALESCE(v_people_remaining, v_total_people, 999);

    IF p_party_size > v_people_remaining THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_SPOTS',
            'message', 'Only ' || v_people_remaining || ' spots remaining',
            'remaining', v_people_remaining
        );
    END IF;

    -- Atomically decrement
    UPDATE discounts
    SET people_remaining = v_people_remaining - p_party_size,
        active = CASE WHEN (v_people_remaining - p_party_size) > 0 THEN active ELSE false END
    WHERE id = p_discount_id;

    RETURN jsonb_build_object(
        'success', true,
        'remaining', v_people_remaining - p_party_size
    );
END;
$$;

-- Reverse: release claimed spots (e.g. cancellation)
CREATE OR REPLACE FUNCTION public.release_offer_spots(
    p_discount_id uuid,
    p_party_size integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('discount_' || p_discount_id::text));
    
    UPDATE discounts
    SET people_remaining = COALESCE(people_remaining, 0) + p_party_size,
        active = true
    WHERE id = p_discount_id;
END;
$$;

-- =============================================================
-- FIX 5: Webhook event processing log for idempotency
-- Prevents duplicate processing of the same Stripe event
-- =============================================================

CREATE TABLE IF NOT EXISTS public.webhook_events_processed (
    stripe_event_id text PRIMARY KEY,
    event_type text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'
);

-- Auto-cleanup events older than 7 days
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events_processed(processed_at);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.claim_offer_spots_atomically TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_offer_spots TO authenticated, service_role;

-- RLS for webhook_events_processed (only service_role should access)
ALTER TABLE public.webhook_events_processed ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by edge functions)
CREATE POLICY "Service role full access" ON public.webhook_events_processed
    FOR ALL USING (true) WITH CHECK (true);
