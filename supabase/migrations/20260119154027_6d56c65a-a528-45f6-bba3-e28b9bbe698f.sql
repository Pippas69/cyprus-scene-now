-- Allow public (and authenticated) users to read plan tier for verified businesses.
-- Postgres doesn't support CREATE POLICY IF NOT EXISTS, so we guard with a DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_subscriptions'
      AND policyname = 'Anyone can view subscriptions for verified businesses'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Anyone can view subscriptions for verified businesses"
      ON public.business_subscriptions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.businesses b
          WHERE b.id = business_subscriptions.business_id
            AND b.verified = true
        )
      )
    $p$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id
ON public.business_subscriptions (business_id);
