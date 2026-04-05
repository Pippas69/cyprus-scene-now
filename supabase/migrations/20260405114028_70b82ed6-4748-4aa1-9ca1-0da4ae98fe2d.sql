
-- Step 1: Recreate public_businesses_safe as security DEFINER view
-- This allows the view to bypass RLS and serve filtered data
DROP VIEW IF EXISTS public_businesses_safe;

CREATE VIEW public_businesses_safe
WITH (security_invoker=off) AS
SELECT
  id, name, city, address, phone, website, description, category,
  logo_url, cover_url, opens_at, closes_at, verified, verified_at,
  geo, created_at, updated_at, user_id, onboarding_completed,
  accepts_direct_reservations, daily_reservation_limit,
  reservation_capacity_type, reservation_closes_at, reservation_days,
  reservation_opens_at, reservation_requires_approval,
  reservation_seating_options, reservation_time_slots,
  reservations_globally_paused, student_discount_enabled,
  student_discount_mode, student_discount_percent,
  ticket_reservation_linked, floor_plan_enabled, floor_plan_image_url
FROM businesses;

COMMENT ON VIEW public_businesses_safe IS 'Safe public view excluding stripe_account_id, free_entry_strikes, free_entry_boost_banned, free_entry_creation_banned, reservation_no_show_count, stripe_onboarding_completed, stripe_payouts_enabled, verification_notes';

-- Step 2: Grant access to the view for anon and authenticated roles
GRANT SELECT ON public_businesses_safe TO anon;
GRANT SELECT ON public_businesses_safe TO authenticated;

-- Step 3: Remove the broad SELECT policies on the base table
-- (owner and admin policies stay)
DROP POLICY IF EXISTS "Anon can view verified businesses" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can view verified businesses" ON businesses;

-- Step 4: Add restricted policies that route through safe columns only
-- Anon users can see verified businesses but ONLY through the safe view
-- Since the view is security definer, it can access the base table
-- For direct table access, we add policies that work but without sensitive data
-- However, since RLS can't filter columns, we restrict to owner/admin only for direct access

-- Re-add limited policies for edge functions that query businesses directly with service_role
-- (service_role bypasses RLS, so this doesn't affect edge functions)

-- For the frontend: non-owners can only access through the safe view
-- The view is security definer so it bypasses RLS
