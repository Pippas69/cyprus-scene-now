-- Fix Critical Error 1: Reservation Phone Numbers Accessible to Wrong Business Owners
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Business owners can manage reservations for their events" ON reservations;
DROP POLICY IF EXISTS "Businesses can view reservations" ON reservations;

-- Users can view their own reservations
CREATE POLICY "Users can view own reservations" ON reservations
FOR SELECT USING (user_id = auth.uid());

-- Business owners can ONLY view reservations for THEIR OWN events
CREATE POLICY "Business owners view reservations for own events" ON reservations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = reservations.event_id
    AND b.user_id = auth.uid()
  )
);

-- Business owners can update reservations for their own events
CREATE POLICY "Business owners update own event reservations" ON reservations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = reservations.event_id
    AND b.user_id = auth.uid()
  )
);

-- Fix Critical Error 2: User Email Addresses Exposed
-- Ensure profiles table only shows emails to the profile owner
DROP POLICY IF EXISTS "Users can view own complete profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON profiles;

-- Users can ONLY view their own complete profile (including email)
CREATE POLICY "Users view own complete profile" ON profiles
FOR SELECT USING (id = auth.uid() OR user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users update own profile" ON profiles
FOR UPDATE USING (id = auth.uid() OR user_id = auth.uid());

-- Add explicit grants to public views for documentation
GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_businesses TO anon, authenticated;
GRANT SELECT ON public.public_discounts TO anon, authenticated;