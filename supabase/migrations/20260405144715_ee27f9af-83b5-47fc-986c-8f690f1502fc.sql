
-- Fix security definer warning on the new view
ALTER VIEW public.public_business_subscriptions SET (security_invoker = on);
