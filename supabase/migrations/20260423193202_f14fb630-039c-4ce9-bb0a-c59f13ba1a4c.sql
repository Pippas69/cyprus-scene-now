
-- ============================================================
-- Φάση 5: Audit log + SMS billing tracking + monthly quota tracking
-- ============================================================

-- 1. Audit log enum
CREATE TYPE public.pending_booking_audit_action AS ENUM (
  'created',
  'sms_sent',
  'sms_resent',
  'sms_delivered',
  'sms_failed',
  'deleted',
  'converted',
  'link_expired',
  'no_show'
);

-- 2. Audit log table
CREATE TABLE public.pending_booking_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_booking_id uuid REFERENCES public.pending_bookings(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action public.pending_booking_audit_action NOT NULL,
  actor_user_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pba_log_booking ON public.pending_booking_audit_log(pending_booking_id, created_at DESC);
CREATE INDEX idx_pba_log_business ON public.pending_booking_audit_log(business_id, created_at DESC);
CREATE INDEX idx_pba_log_action ON public.pending_booking_audit_log(action, created_at DESC);

ALTER TABLE public.pending_booking_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own audit log"
  ON public.pending_booking_audit_log FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all audit logs"
  ON public.pending_booking_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- (Inserts happen via service-role from edge functions only — no insert policy needed)

-- 3. Daily SMS quota tracking + admin notification flag
CREATE TABLE public.business_sms_daily_quota (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quota_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Nicosia')::date,
  sms_count integer NOT NULL DEFAULT 0,
  admin_notified_at_threshold timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, quota_date)
);

ALTER TABLE public.business_sms_daily_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own quota"
  ON public.business_sms_daily_quota FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all quotas"
  ON public.business_sms_daily_quota FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. SMS sending pause flag on businesses (for Φάση 6 — after 3 failed charges)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS sms_sending_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_paused_reason text;

-- 5. Helper: increment daily quota and detect threshold cross (160/200)
CREATE OR REPLACE FUNCTION public.increment_sms_daily_quota(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Nicosia')::date;
  _new_count integer;
  _already_notified timestamptz;
  _threshold_crossed boolean := false;
BEGIN
  INSERT INTO public.business_sms_daily_quota (business_id, quota_date, sms_count)
  VALUES (_business_id, _today, 1)
  ON CONFLICT (business_id, quota_date)
  DO UPDATE SET sms_count = business_sms_daily_quota.sms_count + 1, updated_at = now()
  RETURNING sms_count, admin_notified_at_threshold INTO _new_count, _already_notified;

  IF _new_count >= 160 AND _already_notified IS NULL THEN
    UPDATE public.business_sms_daily_quota
    SET admin_notified_at_threshold = now()
    WHERE business_id = _business_id AND quota_date = _today;
    _threshold_crossed := true;
  END IF;

  RETURN jsonb_build_object(
    'sms_count', _new_count,
    'threshold_crossed', _threshold_crossed,
    'quota_date', _today
  );
END;
$$;

-- 6. Helper: insert audit log entry (callable from edge functions via RPC)
CREATE OR REPLACE FUNCTION public.log_pending_booking_audit(
  _pending_booking_id uuid,
  _business_id uuid,
  _action public.pending_booking_audit_action,
  _actor_user_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.pending_booking_audit_log
    (pending_booking_id, business_id, action, actor_user_id, metadata)
  VALUES
    (_pending_booking_id, _business_id, _action, _actor_user_id, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 7. Cron helper: mark expired pending bookings as link_expired
CREATE OR REPLACE FUNCTION public.expire_pending_booking_links()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expired_count integer := 0;
  _row record;
BEGIN
  FOR _row IN
    UPDATE public.pending_bookings
    SET status = 'link_expired', updated_at = now()
    WHERE status = 'pending' AND expires_at < now()
    RETURNING id, business_id
  LOOP
    INSERT INTO public.pending_booking_audit_log
      (pending_booking_id, business_id, action, metadata)
    VALUES
      (_row.id, _row.business_id, 'link_expired', jsonb_build_object('source', 'cron'));
    _expired_count := _expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object('expired_count', _expired_count, 'ran_at', now());
END;
$$;

-- 8. Cron helper: detect no-shows (10h after event start, still pending)
CREATE OR REPLACE FUNCTION public.detect_pending_booking_no_shows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _no_show_count integer := 0;
  _row record;
BEGIN
  FOR _row IN
    SELECT pb.id, pb.business_id, pb.event_id
    FROM public.pending_bookings pb
    JOIN public.events e ON e.id = pb.event_id
    WHERE pb.status = 'pending'
      AND pb.event_id IS NOT NULL
      AND e.event_date < now() - interval '10 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.pending_booking_audit_log al
        WHERE al.pending_booking_id = pb.id AND al.action = 'no_show'
      )
  LOOP
    INSERT INTO public.pending_booking_audit_log
      (pending_booking_id, business_id, action, metadata)
    VALUES
      (_row.id, _row.business_id, 'no_show',
       jsonb_build_object('event_id', _row.event_id, 'source', 'cron'));
    _no_show_count := _no_show_count + 1;
  END LOOP;

  RETURN jsonb_build_object('no_show_count', _no_show_count, 'ran_at', now());
END;
$$;
