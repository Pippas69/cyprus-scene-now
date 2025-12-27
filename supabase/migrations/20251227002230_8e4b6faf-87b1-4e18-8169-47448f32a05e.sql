-- Add Stripe Connect fields to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Add index for faster lookups by stripe account
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_account_id ON public.businesses(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.stripe_account_id IS 'Stripe Connect Express account ID (acct_xxx)';
COMMENT ON COLUMN public.businesses.stripe_onboarding_completed IS 'Whether the business has completed Stripe Connect onboarding';
COMMENT ON COLUMN public.businesses.stripe_payouts_enabled IS 'Whether Stripe payouts are enabled for this account';