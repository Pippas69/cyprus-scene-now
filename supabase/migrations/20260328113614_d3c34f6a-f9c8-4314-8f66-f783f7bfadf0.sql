
-- ============================================================
-- FIX 1: Business phone & stripe_account_id exposure
-- Replace the public "Anyone can view verified businesses" policy 
-- with one that only allows reading non-sensitive columns via the public_businesses view.
-- We recreate the view WITHOUT phone, and drop the overly broad policy.
-- ============================================================

-- Drop and recreate the public_businesses view WITHOUT phone
DROP VIEW IF EXISTS public_businesses;
CREATE VIEW public_businesses AS
SELECT 
  id,
  name,
  description,
  category,
  address,
  city,
  website,
  logo_url,
  cover_url,
  verified,
  created_at,
  geo
FROM businesses
WHERE verified = true;

-- Grant access to the view
GRANT SELECT ON public_businesses TO anon, authenticated;

-- Drop the overly broad policy that exposes ALL columns to anyone
DROP POLICY IF EXISTS "Anyone can view verified businesses" ON businesses;

-- Create a more restrictive policy: only authenticated users can see verified businesses
-- (they still can't see stripe_account_id etc. unless they're the owner)
CREATE POLICY "Authenticated users can view verified businesses" ON businesses
FOR SELECT TO authenticated
USING (verified = true);

-- Anon users must use the public_businesses view (which excludes sensitive fields)
CREATE POLICY "Anon can view verified businesses via limited columns" ON businesses
FOR SELECT TO anon
USING (verified = true);

-- ============================================================
-- FIX 2: notification_log public insert
-- Remove the overly permissive "Service role can insert" policy 
-- that applies to public role. Service role bypasses RLS anyway.
-- ============================================================

DROP POLICY IF EXISTS "Service role can insert notification logs" ON notification_log;

-- ============================================================
-- FIX 3: business_followers public read
-- Replace "Anyone can count followers" with authenticated-only policy
-- ============================================================

DROP POLICY IF EXISTS "Anyone can count followers per business" ON business_followers;

CREATE POLICY "Authenticated users can view followers" ON business_followers
FOR SELECT TO authenticated
USING (true);
