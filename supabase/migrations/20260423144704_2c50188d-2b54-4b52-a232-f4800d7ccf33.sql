-- ============================================================================
-- Phase 1A: SMS Pending Bookings - Database Scaffolding
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.pending_booking_type AS ENUM ('reservation', 'ticket', 'walk_in');
CREATE TYPE public.pending_booking_status AS ENUM ('pending', 'completed', 'expired', 'cancelled');
CREATE TYPE public.sms_charge_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'undelivered');

-- ============================================================================
-- TABLE: pending_bookings
-- ============================================================================
CREATE TABLE public.pending_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  business_id UUID NOT NULL,
  event_id UUID,
  created_by_user_id UUID NOT NULL,
  booking_type public.pending_booking_type NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  party_size INTEGER,
  seating_preference TEXT,
  preferred_time TIMESTAMPTZ,
  tier_data JSONB,
  notes TEXT,
  status public.pending_booking_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  completed_reservation_id UUID,
  completed_ticket_order_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_bookings_business_status
  ON public.pending_bookings(business_id, status, created_at DESC);
CREATE INDEX idx_pending_bookings_expires
  ON public.pending_bookings(expires_at) WHERE status = 'pending';
CREATE INDEX idx_pending_bookings_phone
  ON public.pending_bookings(customer_phone, created_at DESC);

-- ============================================================================
-- TABLE: sms_charges
-- ============================================================================
CREATE TABLE public.sms_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  pending_booking_id UUID REFERENCES public.pending_bookings(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  twilio_message_sid TEXT UNIQUE,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  cost_currency TEXT NOT NULL DEFAULT 'EUR',
  status public.sms_charge_status NOT NULL DEFAULT 'queued',
  is_billable BOOLEAN NOT NULL DEFAULT false,
  charged_at TIMESTAMPTZ,
  stripe_charge_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_charges_business_created
  ON public.sms_charges(business_id, created_at DESC);
CREATE INDEX idx_sms_charges_uncharged
  ON public.sms_charges(business_id, is_billable, charged_at)
  WHERE charged_at IS NULL AND is_billable = true;
CREATE INDEX idx_sms_charges_twilio_sid
  ON public.sms_charges(twilio_message_sid) WHERE twilio_message_sid IS NOT NULL;

-- ============================================================================
-- TABLE: sms_rate_limits
-- ============================================================================
CREATE TABLE public.sms_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  business_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_rate_limits_phone_time
  ON public.sms_rate_limits(phone_number, sent_at DESC);
CREATE INDEX idx_sms_rate_limits_phone_business_time
  ON public.sms_rate_limits(phone_number, business_id, sent_at DESC);
CREATE INDEX idx_sms_rate_limits_business_time
  ON public.sms_rate_limits(business_id, sent_at DESC);

-- ============================================================================
-- TABLE: business_payment_methods
-- ============================================================================
-- IMPORTANT: Only stores Stripe reference IDs and display metadata.
-- NEVER stores raw card numbers, CVV, or any sensitive card data.
-- Card collection happens via Stripe Elements (PCI-DSS compliant).
CREATE TABLE public.business_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_payment_methods_active
  ON public.business_payment_methods(business_id) WHERE is_active = true;

-- ============================================================================
-- TRIGGERS: updated_at
-- ============================================================================
CREATE TRIGGER update_pending_bookings_updated_at
  BEFORE UPDATE ON public.pending_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_charges_updated_at
  BEFORE UPDATE ON public.sms_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_payment_methods_updated_at
  BEFORE UPDATE ON public.business_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: pending_bookings
-- ============================================================================
CREATE POLICY "Business owners can view their pending bookings"
  ON public.pending_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pending_bookings.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can create pending bookings"
  ON public.pending_bookings FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pending_bookings.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their pending bookings"
  ON public.pending_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pending_bookings.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their pending bookings"
  ON public.pending_bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = pending_bookings.business_id AND b.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: sms_charges (read-only for owners; writes via service role)
-- ============================================================================
CREATE POLICY "Business owners can view their sms charges"
  ON public.sms_charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = sms_charges.business_id AND b.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: sms_rate_limits (service role only — no policies = locked)
-- ============================================================================
-- Intentionally no policies. Only service role bypasses RLS.

-- ============================================================================
-- RLS POLICIES: business_payment_methods
-- ============================================================================
CREATE POLICY "Business owners can view their payment methods"
  ON public.business_payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_payment_methods.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert their payment methods"
  ON public.business_payment_methods FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_payment_methods.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their payment methods"
  ON public.business_payment_methods FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_payment_methods.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their payment methods"
  ON public.business_payment_methods FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_payment_methods.business_id AND b.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate a cryptographically secure 16-char alphanumeric token (base62-like)
CREATE OR REPLACE FUNCTION public.generate_booking_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
  random_bytes BYTEA;
  byte_val INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    result := '';
    random_bytes := gen_random_bytes(16);
    FOR i IN 0..15 LOOP
      byte_val := get_byte(random_bytes, i);
      result := result || substr(chars, (byte_val % 62) + 1, 1);
    END LOOP;

    -- Ensure uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.pending_bookings WHERE token = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique token after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

-- Public RPC: get pending booking by token (for /r/{token} page)
CREATE OR REPLACE FUNCTION public.get_pending_booking_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  business_name TEXT,
  event_id UUID,
  event_title TEXT,
  event_start_at TIMESTAMPTZ,
  booking_type public.pending_booking_type,
  customer_phone TEXT,
  customer_name TEXT,
  party_size INTEGER,
  seating_preference TEXT,
  preferred_time TIMESTAMPTZ,
  tier_data JSONB,
  notes TEXT,
  status public.pending_booking_status,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.business_id,
    b.name AS business_name,
    pb.event_id,
    e.title AS event_title,
    e.start_at AS event_start_at,
    pb.booking_type,
    pb.customer_phone,
    pb.customer_name,
    pb.party_size,
    pb.seating_preference,
    pb.preferred_time,
    pb.tier_data,
    pb.notes,
    pb.status,
    pb.expires_at
  FROM public.pending_bookings pb
  LEFT JOIN public.businesses b ON b.id = pb.business_id
  LEFT JOIN public.events e ON e.id = pb.event_id
  WHERE pb.token = p_token
    AND pb.status = 'pending'
    AND pb.expires_at > now();
END;
$$;

-- Rate-limit check: returns allowed flag + reason
-- Limits: 3/phone/hour, 10/phone/24h, 200/business/24h
CREATE OR REPLACE FUNCTION public.check_sms_rate_limit(
  p_phone TEXT,
  p_business_id UUID
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  hour_count INTEGER,
  day_count INTEGER,
  business_day_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_hour_count INTEGER;
  v_day_count INTEGER;
  v_biz_day_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_hour_count
  FROM public.sms_rate_limits
  WHERE phone_number = p_phone AND sent_at > (now() - INTERVAL '1 hour');

  SELECT COUNT(*) INTO v_day_count
  FROM public.sms_rate_limits
  WHERE phone_number = p_phone AND sent_at > (now() - INTERVAL '24 hours');

  SELECT COUNT(*) INTO v_biz_day_count
  FROM public.sms_rate_limits
  WHERE business_id = p_business_id AND sent_at > (now() - INTERVAL '24 hours');

  IF v_hour_count >= 3 THEN
    RETURN QUERY SELECT false, 'hourly_limit'::TEXT, v_hour_count, v_day_count, v_biz_day_count;
    RETURN;
  END IF;

  IF v_day_count >= 10 THEN
    RETURN QUERY SELECT false, 'daily_limit'::TEXT, v_hour_count, v_day_count, v_biz_day_count;
    RETURN;
  END IF;

  IF v_biz_day_count >= 200 THEN
    RETURN QUERY SELECT false, 'business_daily_limit'::TEXT, v_hour_count, v_day_count, v_biz_day_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'allowed'::TEXT, v_hour_count, v_day_count, v_biz_day_count;
END;
$$;

-- Atomic single-use enforcement
CREATE OR REPLACE FUNCTION public.consume_pending_booking(
  p_token TEXT,
  p_reservation_id UUID DEFAULT NULL,
  p_ticket_order_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  pending_booking_id UUID,
  business_id UUID,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
BEGIN
  SELECT id, business_id, status, expires_at
  INTO v_pending
  FROM public.pending_bookings
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'not_found'::TEXT;
    RETURN;
  END IF;

  IF v_pending.status != 'pending' THEN
    RETURN QUERY SELECT false, v_pending.id, v_pending.business_id, ('already_' || v_pending.status::TEXT);
    RETURN;
  END IF;

  IF v_pending.expires_at < now() THEN
    UPDATE public.pending_bookings SET status = 'expired' WHERE id = v_pending.id;
    RETURN QUERY SELECT false, v_pending.id, v_pending.business_id, 'expired'::TEXT;
    RETURN;
  END IF;

  UPDATE public.pending_bookings
  SET status = 'completed',
      completed_at = now(),
      completed_reservation_id = p_reservation_id,
      completed_ticket_order_id = p_ticket_order_id
  WHERE id = v_pending.id;

  RETURN QUERY SELECT true, v_pending.id, v_pending.business_id, 'completed'::TEXT;
END;
$$;

-- Cleanup: mark expired bookings + prune old rate limit rows (cron-callable)
CREATE OR REPLACE FUNCTION public.expire_old_pending_bookings()
RETURNS TABLE (expired_count INTEGER, pruned_rate_limits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired INTEGER;
  v_pruned INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.pending_bookings
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired FROM updated;

  WITH deleted AS (
    DELETE FROM public.sms_rate_limits
    WHERE sent_at < (now() - INTERVAL '48 hours')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_pruned FROM deleted;

  RETURN QUERY SELECT v_expired, v_pruned;
END;
$$;