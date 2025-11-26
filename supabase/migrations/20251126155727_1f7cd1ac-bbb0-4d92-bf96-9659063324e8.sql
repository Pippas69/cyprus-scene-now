-- Fix Security Definer Views by explicitly setting SECURITY INVOKER

-- Drop and recreate discount_scan_stats view with SECURITY INVOKER
DROP VIEW IF EXISTS public.discount_scan_stats;
CREATE VIEW public.discount_scan_stats
WITH (security_invoker = true)
AS
SELECT 
  d.id AS discount_id,
  d.title,
  d.business_id,
  count(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'view') AS total_views,
  count(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'verify') AS total_verifications,
  count(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'redeem') AS total_redemptions,
  count(DISTINCT ds.id) AS total_scans,
  count(DISTINCT ds.scanned_by) AS unique_scanners,
  max(ds.scanned_at) AS last_scanned_at,
  count(DISTINCT ds.id) FILTER (WHERE ds.scanned_at >= (now() - interval '24 hours')) AS scans_last_24h,
  count(DISTINCT ds.id) FILTER (WHERE ds.scanned_at >= (now() - interval '7 days')) AS scans_last_7d
FROM discounts d
LEFT JOIN discount_scans ds ON ds.discount_id = d.id
GROUP BY d.id, d.title, d.business_id;

-- Drop and recreate event_rsvp_counts view with SECURITY INVOKER
DROP VIEW IF EXISTS public.event_rsvp_counts;
CREATE VIEW public.event_rsvp_counts
WITH (security_invoker = true)
AS
SELECT 
  event_id,
  count(*) FILTER (WHERE status = 'going') AS going_count,
  count(*) FILTER (WHERE status = 'interested') AS interested_count,
  count(*) AS total_count
FROM rsvps
GROUP BY event_id;

-- Drop and recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
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
FROM profiles;