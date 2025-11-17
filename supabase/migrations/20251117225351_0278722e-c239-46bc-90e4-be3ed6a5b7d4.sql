-- COMPREHENSIVE SECURITY FIX MIGRATION - PART 1
-- This migration fixes all database security issues identified by the linter

-- 1. SET SEARCH_PATH ON ALL FUNCTIONS TO PREVENT SQL INJECTION
-- Fix all functions that have mutable search_path

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.generate_confirmation_code() SET search_path = public;
ALTER FUNCTION public.generate_qr_token() SET search_path = public;
ALTER FUNCTION public.mask_phone(phone_number text) SET search_path = public;
ALTER FUNCTION public.get_available_capacity(p_event_id uuid) SET search_path = public;
ALTER FUNCTION public.get_business_coordinates(business_ids uuid[]) SET search_path = public;
ALTER FUNCTION public.get_business_follower_count(business_id_param uuid) SET search_path = public;
ALTER FUNCTION public.get_discount_qr_token(discount_id uuid) SET search_path = public;
ALTER FUNCTION public.user_has_reservation_with_business(business_id uuid) SET search_path = public;
ALTER FUNCTION public.search_content(search_query text) SET search_path = public;

-- 2. ENABLE RLS ON ALL PUBLIC TABLES (if not already enabled)
DO $$ 
BEGIN
  ALTER TABLE IF EXISTS public.business_followers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.businesses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.discounts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.favorites ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.featured ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.realtime_stats ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.redemptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.rsvps ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;
END $$;