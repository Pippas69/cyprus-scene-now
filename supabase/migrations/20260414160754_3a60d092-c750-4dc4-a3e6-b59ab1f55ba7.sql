-- ============================================================
-- SECURITY FIX: Hide sensitive business columns from public access
-- ============================================================
-- Problem: Anyone can query businesses table and see internal fields
-- like stripe_account_id, free_entry_strikes, verification_notes
-- 
-- Solution: Remove direct public SELECT on base table,
-- route public access through safe views that exclude sensitive columns
-- ============================================================

-- Step 1: Drop the broad SELECT policies that expose ALL columns
DROP POLICY IF EXISTS "Anon can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can view verified businesses" ON public.businesses;

-- Step 2: Recreate public_businesses_safe as SECURITY DEFINER view
-- (bypasses RLS so it works without base table policies for public users)
-- Includes ALL columns EXCEPT sensitive ones
DROP VIEW IF EXISTS public.public_businesses_safe;
CREATE VIEW public.public_businesses_safe
WITH (security_invoker = false)
AS SELECT 
  id, name, city, address, phone, website, description, category,
  logo_url, cover_url, opens_at, closes_at, verified, verified_at, geo,
  created_at, updated_at, user_id, onboarding_completed,
  accepts_direct_reservations, daily_reservation_limit,
  reservation_capacity_type, reservation_closes_at, reservation_days,
  reservation_opens_at, reservation_requires_approval,
  reservation_seating_options, reservation_time_slots,
  reservations_globally_paused, student_discount_enabled,
  student_discount_mode, student_discount_percent,
  ticket_reservation_linked, floor_plan_enabled, floor_plan_image_url
FROM public.businesses
WHERE verified = true;

-- Step 3: Also recreate public_businesses as SECURITY DEFINER
DROP VIEW IF EXISTS public.public_businesses;
CREATE VIEW public.public_businesses
WITH (security_invoker = false)
AS SELECT 
  id, name, description, category, address, city, website,
  logo_url, cover_url, verified, created_at, geo
FROM public.businesses
WHERE verified = true;

-- Step 4: Grant access on views to public roles
GRANT SELECT ON public.public_businesses_safe TO anon, authenticated;
GRANT SELECT ON public.public_businesses TO anon, authenticated;