-- Re-add stripe columns to businesses (urgent rollback)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT false;

-- Restore data from backup table
UPDATE public.businesses b
SET 
    stripe_account_id = bsd.stripe_account_id,
    stripe_onboarding_completed = bsd.stripe_onboarding_completed,
    stripe_payouts_enabled = bsd.stripe_payouts_enabled
FROM public.business_stripe_details bsd
WHERE b.id = bsd.business_id;