-- Step 1: Create business_stripe_details table
CREATE TABLE public.business_stripe_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    stripe_account_id text,
    stripe_onboarding_completed boolean DEFAULT false,
    stripe_payouts_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Step 2: Migrate existing data
INSERT INTO public.business_stripe_details (business_id, stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled)
SELECT id, stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled
FROM public.businesses;

-- Step 3: Enable RLS with owner/admin only policies
ALTER TABLE public.business_stripe_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their own stripe details"
ON public.business_stripe_details FOR SELECT
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can update their own stripe details"
ON public.business_stripe_details FOR UPDATE
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all stripe details"
ON public.business_stripe_details FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update any stripe details"
ON public.business_stripe_details FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service can insert stripe details"
ON public.business_stripe_details FOR INSERT
WITH CHECK (true);

-- Step 4: Drop dependent views FIRST
DROP VIEW IF EXISTS public.public_businesses_safe;
DROP VIEW IF EXISTS public.public_business_subscriptions;

-- Step 5: Drop sensitive columns from businesses
ALTER TABLE public.businesses DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS stripe_onboarding_completed;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS stripe_payouts_enabled;

-- Step 6: Re-add the public SELECT policies on businesses (now safe)
CREATE POLICY "Anon can view verified businesses"
ON public.businesses FOR SELECT TO anon
USING (verified = true);

CREATE POLICY "Authenticated users can view verified businesses"
ON public.businesses FOR SELECT TO authenticated
USING (verified = true);

-- Step 7: Recreate public_businesses_safe view without stripe columns
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

GRANT SELECT ON public.public_businesses_safe TO anon;
GRANT SELECT ON public.public_businesses_safe TO authenticated;