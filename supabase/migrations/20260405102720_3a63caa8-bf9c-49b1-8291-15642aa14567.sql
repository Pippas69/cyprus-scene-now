
-- ============================================
-- 1. BOOST ANALYTICS: Remove permissive INSERT/UPDATE policies
-- ============================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert boost analytics" ON public.boost_analytics;
DROP POLICY IF EXISTS "Anyone can update boost analytics" ON public.boost_analytics;

-- No new INSERT/UPDATE policies needed — service_role bypasses RLS automatically.
-- Only SELECT policies remain (business owners + admins).

-- ============================================
-- 2. REALTIME CHANNELS: Add RLS to realtime.messages
-- ============================================

-- Enable RLS on realtime.messages if not already
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read only messages from channels they have access to
-- The extension column contains the topic/channel name
CREATE POLICY "Users can read their own realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow users to receive messages on channels scoped to their user ID
  extension::text LIKE '%' || auth.uid()::text || '%'
  OR
  -- Allow public channel topics (e.g., events, business_posts)
  extension::text LIKE 'realtime:public:events%'
  OR
  extension::text LIKE 'realtime:public:business_posts%'
  OR
  extension::text LIKE 'realtime:public:event_posts%'
  OR
  extension::text LIKE 'realtime:public:rsvps%'
  OR
  extension::text LIKE 'realtime:public:post_reactions%'
);

-- Allow insert for the realtime system (service role handles this)
-- No INSERT policy = only service_role can insert

-- ============================================
-- 3. BUSINESSES: Create safe public view
-- ============================================

-- Create a view that excludes sensitive internal fields
CREATE OR REPLACE VIEW public.public_businesses_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  name,
  city,
  address,
  phone,
  website,
  description,
  category,
  logo_url,
  cover_url,
  opens_at,
  closes_at,
  verified,
  verified_at,
  geo,
  created_at,
  updated_at,
  user_id,
  onboarding_completed,
  accepts_direct_reservations,
  daily_reservation_limit,
  reservation_capacity_type,
  reservation_closes_at,
  reservation_days,
  reservation_opens_at,
  reservation_requires_approval,
  reservation_seating_options,
  reservation_time_slots,
  reservations_globally_paused,
  student_discount_enabled,
  student_discount_mode,
  student_discount_percent,
  ticket_reservation_linked,
  floor_plan_enabled,
  floor_plan_image_url
FROM public.businesses;

COMMENT ON VIEW public.public_businesses_safe IS 'Safe public view of businesses excluding stripe_account_id, free_entry_strikes, free_entry_boost_banned, free_entry_creation_banned, reservation_no_show_count, stripe_onboarding_completed, stripe_payouts_enabled, verification_notes';
