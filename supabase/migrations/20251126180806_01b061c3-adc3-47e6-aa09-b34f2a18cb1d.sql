-- Phase 1: Create public_discounts view (hide QR tokens from public access)
CREATE OR REPLACE VIEW public.public_discounts 
WITH (security_invoker = true) AS
SELECT 
  id, business_id, title, description, percent_off,
  start_at, end_at, terms, active, created_at
FROM discounts
WHERE active = true AND end_at > now();

GRANT SELECT ON public.public_discounts TO anon, authenticated;

-- Phase 2: Create public_businesses view (hide verification_notes and user_id)
CREATE OR REPLACE VIEW public.public_businesses 
WITH (security_invoker = true) AS
SELECT 
  id, name, description, category, address, city,
  phone, website, logo_url, cover_url, verified, created_at, geo
FROM businesses
WHERE verified = true;

GRANT SELECT ON public.public_businesses TO anon, authenticated;

-- Phase 3: Restrict analytics data to business owners only

-- Restrict discount_views to business owners
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'discount_views' 
    AND policyname = 'Business owners can view their discount views'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view discount views" ON discount_views;
    CREATE POLICY "Business owners can view their discount views" ON discount_views
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM discounts d
        JOIN businesses b ON b.id = d.business_id
        WHERE d.id = discount_views.discount_id
        AND b.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Restrict event_views to business owners
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_views' 
    AND policyname = 'Business owners can view their event views'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view event views" ON event_views;
    CREATE POLICY "Business owners can view their event views" ON event_views
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM events e
        JOIN businesses b ON b.id = e.business_id
        WHERE e.id = event_views.event_id
        AND b.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Restrict engagement_events to business owners
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'engagement_events' 
    AND policyname = 'Business owners can view their engagement events'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view engagement events" ON engagement_events;
    CREATE POLICY "Business owners can view their engagement events" ON engagement_events
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.id = engagement_events.business_id
        AND b.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Restrict daily_analytics to business owners
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_analytics' 
    AND policyname = 'Business owners can view their daily analytics'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view daily analytics" ON daily_analytics;
    CREATE POLICY "Business owners can view their daily analytics" ON daily_analytics
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.id = daily_analytics.business_id
        AND b.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Restrict connection_stats_monitor to authenticated users only (admin check in app code)
REVOKE SELECT ON connection_stats_monitor FROM anon;
GRANT SELECT ON connection_stats_monitor TO authenticated;

-- Phase 4: Add explicit grant for public_profiles view
GRANT SELECT ON public.public_profiles TO anon, authenticated;