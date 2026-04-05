-- ============================================
-- FIX 1: Protect Stripe IDs on businesses table
-- ============================================

-- Drop the broad anon/auth SELECT policies that expose all columns
DROP POLICY IF EXISTS "Anon can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can view verified businesses" ON public.businesses;

-- Recreate public_businesses_safe with verified filter and security_invoker=false
DROP VIEW IF EXISTS public.public_businesses_safe;
CREATE VIEW public.public_businesses_safe
WITH (security_invoker = false)
AS
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
FROM businesses
WHERE verified = true;

-- Grant access to the safe view
GRANT SELECT ON public.public_businesses_safe TO anon;
GRANT SELECT ON public.public_businesses_safe TO authenticated;

-- ============================================
-- FIX 2: Remove CRM guests from Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime DROP TABLE public.crm_guests;