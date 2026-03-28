
-- Fix Security Definer View: Recreate public_businesses with security_invoker=on
DROP VIEW IF EXISTS public_businesses;
CREATE VIEW public_businesses
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  description,
  category,
  address,
  city,
  website,
  logo_url,
  cover_url,
  verified,
  created_at,
  geo
FROM businesses
WHERE verified = true;

GRANT SELECT ON public_businesses TO anon, authenticated;
