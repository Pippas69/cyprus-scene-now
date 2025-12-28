-- Fix event_views RLS policy to allow anonymous tracking
DROP POLICY IF EXISTS "Authenticated can track event views" ON event_views;
CREATE POLICY "Anyone can track event views" ON event_views
FOR INSERT WITH CHECK (true);

-- Fix discount_views RLS policy to allow anonymous tracking
DROP POLICY IF EXISTS "Authenticated can track discount views" ON discount_views;
CREATE POLICY "Anyone can track discount views" ON discount_views
FOR INSERT WITH CHECK (true);