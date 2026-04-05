
-- Create a safe view for business subscriptions that hides Stripe IDs
-- Only exposes: business_id, plan_slug, status
CREATE OR REPLACE VIEW public.public_business_subscriptions AS
SELECT 
  bs.business_id,
  sp.slug AS plan_slug,
  bs.status
FROM public.business_subscriptions bs
JOIN public.subscription_plans sp ON sp.id = bs.plan_id;

-- Grant access to anon and authenticated roles
GRANT SELECT ON public.public_business_subscriptions TO anon, authenticated;
