-- Public visibility for active boosts (needed for Feed/Events/Offers top sections)

-- Event boosts
ALTER TABLE public.event_boosts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'event_boosts' AND policyname = 'Public can view active event boosts'
  ) THEN
    CREATE POLICY "Public can view active event boosts"
    ON public.event_boosts
    FOR SELECT
    USING (
      status = 'active'
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
    );
  END IF;
END$$;

-- Offer boosts
ALTER TABLE public.offer_boosts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'offer_boosts' AND policyname = 'Public can view active offer boosts'
  ) THEN
    CREATE POLICY "Public can view active offer boosts"
    ON public.offer_boosts
    FOR SELECT
    USING (
      COALESCE(active, false) = true
      AND status = 'active'
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
    );
  END IF;
END$$;