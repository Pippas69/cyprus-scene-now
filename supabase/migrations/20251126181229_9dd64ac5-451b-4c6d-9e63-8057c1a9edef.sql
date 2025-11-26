-- Phase 1: Fix discount_scans - CRITICAL FOR BILLING
-- Remove dangerous "Anyone can insert" policy
DROP POLICY IF EXISTS "Anyone can insert scan records" ON discount_scans;

-- Only authenticated users can insert scans
CREATE POLICY "Authenticated users can insert scans" ON discount_scans
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Business owners can view their own scan records
DROP POLICY IF EXISTS "Business owners can view their discount scans" ON discount_scans;
CREATE POLICY "Business owners can view their discount scans" ON discount_scans
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM discounts d
    JOIN businesses b ON d.business_id = b.id
    WHERE d.id = discount_scans.discount_id
    AND b.user_id = auth.uid()
  )
);

-- Phase 2: Fix Analytics Tracking Tables
-- event_views: require authentication
DROP POLICY IF EXISTS "Anyone can track event views" ON event_views;
CREATE POLICY "Authenticated can track event views" ON event_views
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- discount_views: require authentication  
DROP POLICY IF EXISTS "Anyone can track discount views" ON discount_views;
CREATE POLICY "Authenticated can track discount views" ON discount_views
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- engagement_events: require authentication
DROP POLICY IF EXISTS "Anyone can track engagement" ON engagement_events;
CREATE POLICY "Authenticated can track engagement" ON engagement_events
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Phase 3: Fix Admin Audit Log Tampering
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON admin_audit_log;
CREATE POLICY "Only admins can insert audit log" ON admin_audit_log
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Phase 4: Fix Event Messages Privacy
DROP POLICY IF EXISTS "Event messages are viewable by everyone" ON messages;
CREATE POLICY "Event messages viewable by attendees" ON messages
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM rsvps
      WHERE rsvps.event_id = messages.event_id
      AND rsvps.user_id = auth.uid()
    )
  )
);

-- Phase 5: Fix Realtime Stats Visibility
DROP POLICY IF EXISTS "Stats are viewable by everyone" ON realtime_stats;
CREATE POLICY "Business owners can view their stats" ON realtime_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = realtime_stats.event_id
    AND b.user_id = auth.uid()
  )
);

-- Phase 6: Add Explicit Grants to Public Views
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_businesses TO anon, authenticated;
GRANT SELECT ON public.public_discounts TO anon, authenticated;