-- Add num_segments to sms_charges so we can bill per segment (Twilio charges per segment)
ALTER TABLE public.sms_charges 
  ADD COLUMN IF NOT EXISTS num_segments integer NOT NULL DEFAULT 1;

-- Recompute the SMS balance view to multiply cost by segments and to also surface
-- "queued" charges that have not yet been confirmed by the Twilio webhook so the
-- business owner sees the balance update immediately after sending.
CREATE OR REPLACE VIEW public.v_business_sms_balance AS
SELECT
  b.id AS business_id,
  -- Unbilled = anything sent but not yet billed via stripe (whether the DLR
  -- has already flipped is_billable=true or not). Cost is per-segment.
  COALESCE(
    SUM(
      CASE
        WHEN s.is_billable = true AND s.billed_at IS NULL
          THEN s.cost_cents * GREATEST(s.num_segments, 1)
        WHEN s.is_billable = false AND s.billed_at IS NULL
             AND s.status IN ('queued','sent','delivered')
          -- pending DLR — assume default 5c/segment
          THEN 5 * GREATEST(s.num_segments, 1)
        ELSE 0
      END
    ),
    0
  )::int AS unbilled_cents,
  COUNT(s.id) FILTER (
    WHERE s.billed_at IS NULL
      AND s.status IN ('queued','sent','delivered')
  )::int AS unbilled_count
FROM public.businesses b
LEFT JOIN public.sms_charges s ON s.business_id = b.id
GROUP BY b.id;

GRANT SELECT ON public.v_business_sms_balance TO authenticated;

-- Make sure realtime fires for sms_charges so the Billing page can subscribe
ALTER TABLE public.sms_charges REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sms_charges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_charges;
  END IF;
END$$;