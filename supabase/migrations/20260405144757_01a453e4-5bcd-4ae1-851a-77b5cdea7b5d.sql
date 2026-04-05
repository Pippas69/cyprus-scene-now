
-- Remove the overly permissive policy that exposes Stripe IDs
DROP POLICY IF EXISTS "Anyone can view subscription plan info" ON public.business_subscriptions;

-- Recreate view as SECURITY DEFINER so it can read the underlying table
-- but only exposes safe columns (business_id, plan_slug, status)
DROP VIEW IF EXISTS public.public_business_subscriptions;

CREATE OR REPLACE VIEW public.public_business_subscriptions 
WITH (security_invoker = off)
AS
SELECT 
  bs.business_id,
  sp.slug AS plan_slug,
  bs.status
FROM public.business_subscriptions bs
JOIN public.subscription_plans sp ON sp.id = bs.plan_id;

-- Grant read access to the view
GRANT SELECT ON public.public_business_subscriptions TO anon, authenticated;
