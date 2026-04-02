-- Drop and recreate view WITHOUT security_invoker so it bypasses RLS
-- This is safe because the view ONLY exposes non-sensitive columns
DROP VIEW IF EXISTS public.public_business_subscriptions;

CREATE VIEW public.public_business_subscriptions AS
SELECT 
  bs.business_id,
  sp.slug as plan_slug,
  sp.name as plan_name,
  bs.status,
  bs.beta_tester
FROM public.business_subscriptions bs
LEFT JOIN public.subscription_plans sp ON bs.plan_id = sp.id
WHERE EXISTS (
  SELECT 1 FROM public.businesses b 
  WHERE b.id = bs.business_id AND b.verified = true
);