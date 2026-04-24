CREATE TABLE IF NOT EXISTS public.sms_billing_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  sms_count int NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('success','failed')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('threshold','monthly','manual')),
  stripe_payment_intent_id text,
  stripe_payment_method_id text,
  error_code text,
  error_message text,
  attempt_number int NOT NULL DEFAULT 1,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sba_business_time ON public.sms_billing_attempts(business_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sba_failed_recent ON public.sms_billing_attempts(business_id, attempted_at DESC) WHERE status = 'failed';

ALTER TABLE public.sms_billing_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sba_owner_select" ON public.sms_billing_attempts;
CREATE POLICY "sba_owner_select"
  ON public.sms_billing_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = sms_billing_attempts.business_id AND b.user_id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sms_charges' AND column_name='billed_at') THEN
    ALTER TABLE public.sms_charges ADD COLUMN billed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sms_charges' AND column_name='billing_attempt_id') THEN
    ALTER TABLE public.sms_charges ADD COLUMN billing_attempt_id uuid REFERENCES public.sms_billing_attempts(id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_sms_charges_unbilled_v2 ON public.sms_charges(business_id) WHERE is_billable = true AND billed_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='sms_paused_reason') THEN
    ALTER TABLE public.businesses ADD COLUMN sms_paused_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='sms_paused_at') THEN
    ALTER TABLE public.businesses ADD COLUMN sms_paused_at timestamptz;
  END IF;
END$$;

CREATE OR REPLACE VIEW public.v_business_sms_balance AS
SELECT
  b.id AS business_id,
  COALESCE(SUM(s.cost_cents) FILTER (WHERE s.is_billable = true AND s.billed_at IS NULL), 0)::int AS unbilled_cents,
  COUNT(s.id) FILTER (WHERE s.is_billable = true AND s.billed_at IS NULL)::int AS unbilled_count
FROM public.businesses b
LEFT JOIN public.sms_charges s ON s.business_id = b.id
GROUP BY b.id;

GRANT SELECT ON public.v_business_sms_balance TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_sms_balance(p_business_id uuid)
RETURNS TABLE(unbilled_cents int, unbilled_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT v.unbilled_cents, v.unbilled_count
  FROM public.v_business_sms_balance v
  WHERE v.business_id = p_business_id;
END$$;

GRANT EXECUTE ON FUNCTION public.get_my_sms_balance(uuid) TO authenticated;