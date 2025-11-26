-- Phase 1: Recreate views with security_invoker = true

-- Recreate discount_scan_stats view
DROP VIEW IF EXISTS public.discount_scan_stats CASCADE;
CREATE VIEW public.discount_scan_stats
WITH (security_invoker = true)
AS
SELECT 
  d.id as discount_id,
  d.business_id,
  d.title,
  COUNT(DISTINCT ds.id) as total_scans,
  COUNT(DISTINCT CASE WHEN ds.scan_type = 'verification' THEN ds.id END) as total_verifications,
  COUNT(DISTINCT r.id) as total_redemptions,
  COUNT(DISTINCT dv.id) as total_views,
  COUNT(DISTINCT ds.scanned_by) as unique_scanners,
  MAX(ds.scanned_at) as last_scanned_at,
  COUNT(DISTINCT CASE WHEN ds.scanned_at >= NOW() - INTERVAL '24 hours' THEN ds.id END) as scans_last_24h,
  COUNT(DISTINCT CASE WHEN ds.scanned_at >= NOW() - INTERVAL '7 days' THEN ds.id END) as scans_last_7d
FROM public.discounts d
LEFT JOIN public.discount_scans ds ON d.id = ds.discount_id
LEFT JOIN public.redemptions r ON d.id = r.discount_id
LEFT JOIN public.discount_views dv ON d.id = dv.discount_id
GROUP BY d.id, d.business_id, d.title;

-- Recreate event_rsvp_counts view
DROP VIEW IF EXISTS public.event_rsvp_counts CASCADE;
CREATE VIEW public.event_rsvp_counts
WITH (security_invoker = true)
AS
SELECT 
  event_id,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'going') as going_count,
  COUNT(*) FILTER (WHERE status = 'interested') as interested_count
FROM public.rsvps
GROUP BY event_id;

-- Recreate public_profiles view
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  first_name,
  last_name,
  avatar_url,
  city,
  town,
  interests,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to views
GRANT SELECT ON public.discount_scan_stats TO anon, authenticated;
GRANT SELECT ON public.event_rsvp_counts TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Recreate connection_stats_monitor view
DROP VIEW IF EXISTS public.connection_stats_monitor CASCADE;
CREATE VIEW public.connection_stats_monitor
WITH (security_invoker = true)
AS
SELECT 
  state,
  COUNT(*) as connection_count,
  NOW() as checked_at
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

GRANT SELECT ON public.connection_stats_monitor TO anon, authenticated;

-- Phase 2: Add search_path to SECURITY DEFINER functions
ALTER FUNCTION public.get_business_analytics SET search_path = public;
ALTER FUNCTION public.update_realtime_stats SET search_path = public;

-- Phase 6: Add search_path to SECURITY INVOKER functions (preventive)
ALTER FUNCTION public.set_reservation_confirmation SET search_path = public;
ALTER FUNCTION public.validate_reservation_capacity SET search_path = public;
ALTER FUNCTION public.get_business_coordinates SET search_path = public;