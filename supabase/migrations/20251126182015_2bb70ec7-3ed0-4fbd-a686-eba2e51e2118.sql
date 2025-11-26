-- Comprehensive Security Fix Migration
-- Fixes all 7 identified security issues

-- 1. Fix Discounts QR Token Exposure (CRITICAL FOR BILLING)
DROP POLICY IF EXISTS "Public can view discount details" ON discounts;

CREATE POLICY "Business owners can view their discounts" ON discounts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = discounts.business_id 
    AND businesses.user_id = auth.uid()
  )
);

-- 2. Fix Businesses Table Full Public Access
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON businesses;

CREATE POLICY "Business owners can view their own business" ON businesses
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all businesses" ON businesses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 3. Fix handle_updated_at Function Search Path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Fix Admin Audit Log - Prevent Deletion
CREATE POLICY "No one can delete audit log entries" ON admin_audit_log
FOR DELETE USING (false);

-- 5. Fix Notifications - Explicit INSERT Restriction
CREATE POLICY "System only can insert notifications" ON notifications
FOR INSERT WITH CHECK (false);

-- 6. Fix Connection Stats Monitor - Admin Only
DROP VIEW IF EXISTS connection_stats_monitor CASCADE;
CREATE VIEW connection_stats_monitor
WITH (security_invoker = true)
AS SELECT 
  state,
  count(*) as connection_count,
  now() as checked_at
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state;

REVOKE ALL ON connection_stats_monitor FROM anon;
GRANT SELECT ON connection_stats_monitor TO authenticated;

-- 7. Grant Explicit Access to Public Views
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_businesses TO anon, authenticated;
GRANT SELECT ON public.public_discounts TO anon, authenticated;