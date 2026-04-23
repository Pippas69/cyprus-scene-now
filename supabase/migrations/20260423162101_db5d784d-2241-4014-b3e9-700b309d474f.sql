
-- Drop old function signatures that conflict with new return types
DROP FUNCTION IF EXISTS public.get_pending_booking_by_token(TEXT);
DROP FUNCTION IF EXISTS public.consume_pending_booking(TEXT);
DROP FUNCTION IF EXISTS public.check_sms_rate_limit(TEXT, UUID);
DROP FUNCTION IF EXISTS public.expire_old_pending_bookings();
DROP FUNCTION IF EXISTS public.generate_booking_token();

-- ====== ENUMS (idempotent) ======
DO $$ BEGIN
  CREATE TYPE public.pending_booking_type AS ENUM ('reservation', 'ticket', 'walk_in');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pending_booking_status AS ENUM ('pending', 'completed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sms_charge_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'undelivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLE: pending_bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pending_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
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
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  completed_reservation_id UUID,
  completed_ticket_order_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_pending_booking()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expires_at <= NEW.created_at THEN
    RAISE EXCEPTION 'expires_at must be after created_at';
  END IF;
  IF length(NEW.token) < 16 THEN
    RAISE EXCEPTION 'token must be at least 16 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_pending_booking ON public.pending_bookings;
CREATE TRIGGER trg_validate_pending_booking
  BEFORE INSERT OR UPDATE ON public.pending_bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_pending_booking();

DROP TRIGGER IF EXISTS trg_pending_bookings_updated_at ON public.pending_bookings;
CREATE TRIGGER trg_pending_bookings_updated_at
  BEFORE UPDATE ON public.pending_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pending_bookings_business_status_created
  ON public.pending_bookings(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_expires
  ON public.pending_bookings(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_bookings_phone
  ON public.pending_bookings(customer_phone);

ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view own pending bookings" ON public.pending_bookings;
CREATE POLICY "Business owners view own pending bookings"
  ON public.pending_bookings FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Business owners create pending bookings" ON public.pending_bookings;
CREATE POLICY "Business owners create pending bookings"
  ON public.pending_bookings FOR INSERT
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Business owners update own pending bookings" ON public.pending_bookings;
CREATE POLICY "Business owners update own pending bookings"
  ON public.pending_bookings FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================
-- TABLE: sms_charges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  pending_booking_id UUID REFERENCES public.pending_bookings(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  twilio_message_sid TEXT,
  cost_cents INTEGER,
  status public.sms_charge_status NOT NULL DEFAULT 'queued',
  is_billable BOOLEAN NOT NULL DEFAULT false,
  charged_at TIMESTAMPTZ,
  stripe_charge_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_sms_charges_updated_at ON public.sms_charges;
CREATE TRIGGER trg_sms_charges_updated_at
  BEFORE UPDATE ON public.sms_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sms_charges_business_created
  ON public.sms_charges(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_charges_unbilled
  ON public.sms_charges(business_id, is_billable, charged_at)
  WHERE charged_at IS NULL AND is_billable = true;
CREATE INDEX IF NOT EXISTS idx_sms_charges_twilio_sid
  ON public.sms_charges(twilio_message_sid) WHERE twilio_message_sid IS NOT NULL;

ALTER TABLE public.sms_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view own sms charges" ON public.sms_charges;
CREATE POLICY "Business owners view own sms charges"
  ON public.sms_charges FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================
-- TABLE: sms_rate_limits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_phone_sent
  ON public.sms_rate_limits(phone_number, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_phone_business_sent
  ON public.sms_rate_limits(phone_number, business_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_business_sent
  ON public.sms_rate_limits(business_id, sent_at DESC);

ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: business_payment_methods
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, stripe_payment_method_id)
);

DROP TRIGGER IF EXISTS trg_business_payment_methods_updated_at ON public.business_payment_methods;
CREATE TRIGGER trg_business_payment_methods_updated_at
  BEFORE UPDATE ON public.business_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_business_payment_methods_business_active
  ON public.business_payment_methods(business_id, is_active)
  WHERE is_active = true;

ALTER TABLE public.business_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view own payment methods" ON public.business_payment_methods;
CREATE POLICY "Business owners view own payment methods"
  ON public.business_payment_methods FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Business owners insert own payment methods" ON public.business_payment_methods;
CREATE POLICY "Business owners insert own payment methods"
  ON public.business_payment_methods FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Business owners update own payment methods" ON public.business_payment_methods;
CREATE POLICY "Business owners update own payment methods"
  ON public.business_payment_methods FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Business owners delete own payment methods" ON public.business_payment_methods;
CREATE POLICY "Business owners delete own payment methods"
  ON public.business_payment_methods FOR DELETE
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE FUNCTION public.generate_booking_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  token TEXT;
  i INTEGER;
  rand_bytes BYTEA;
  attempts INTEGER := 0;
BEGIN
  LOOP
    token := '';
    rand_bytes := gen_random_bytes(16);
    FOR i IN 0..15 LOOP
      token := token || substr(alphabet, (get_byte(rand_bytes, i) % length(alphabet)) + 1, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.pending_bookings WHERE pending_bookings.token = token) THEN
      RETURN token;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique token after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION public.get_pending_booking_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  business_name TEXT,
  event_id UUID,
  event_title TEXT,
  event_start_at TIMESTAMPTZ,
  event_location TEXT,
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pb.id, pb.business_id, b.name AS business_name,
    pb.event_id, e.title AS event_title, e.start_at AS event_start_at, e.location AS event_location,
    pb.booking_type, pb.customer_phone, pb.customer_name,
    pb.party_size, pb.seating_preference, pb.preferred_time,
    pb.tier_data, pb.notes, pb.status, pb.expires_at
  FROM public.pending_bookings pb
  JOIN public.businesses b ON b.id = pb.business_id
  LEFT JOIN public.events e ON e.id = pb.event_id
  WHERE pb.token = _token
    AND pb.status = 'pending'
    AND pb.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_booking_by_token(TEXT) TO anon, authenticated;

CREATE FUNCTION public.check_sms_rate_limit(_phone TEXT, _business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_phone_1h INTEGER;
  count_phone_24h INTEGER;
  count_business_24h INTEGER;
BEGIN
  SELECT count(*) INTO count_phone_1h FROM public.sms_rate_limits
  WHERE phone_number = _phone AND sent_at > now() - interval '1 hour';
  IF count_phone_1h >= 3 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'phone_hourly_limit', 'limit', 3);
  END IF;

  SELECT count(*) INTO count_phone_24h FROM public.sms_rate_limits
  WHERE phone_number = _phone AND sent_at > now() - interval '24 hours';
  IF count_phone_24h >= 10 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'phone_daily_limit', 'limit', 10);
  END IF;

  SELECT count(*) INTO count_business_24h FROM public.sms_rate_limits
  WHERE business_id = _business_id AND sent_at > now() - interval '24 hours';
  IF count_business_24h >= 200 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'business_daily_limit', 'limit', 200);
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

CREATE FUNCTION public.consume_pending_booking(_token TEXT)
RETURNS public.pending_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.pending_bookings;
BEGIN
  UPDATE public.pending_bookings
  SET status = 'completed', completed_at = now()
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Pending booking not found, expired, or already used';
  END IF;
  RETURN result;
END;
$$;

CREATE FUNCTION public.expire_old_pending_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.pending_bookings
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at <= now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
