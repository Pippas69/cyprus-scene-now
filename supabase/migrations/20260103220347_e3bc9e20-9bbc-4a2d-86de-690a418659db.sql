-- =====================================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- =====================================================

-- 1. CREATE SECURE INVITE CODE VALIDATION FUNCTION
-- This replaces direct table access with a secure RPC function
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS TABLE (is_valid boolean, code_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code text;
BEGIN
  normalized_code := UPPER(TRIM(p_code));
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN b.id IS NULL THEN false
      WHEN b.is_active = false THEN false
      WHEN b.expires_at IS NOT NULL AND b.expires_at <= now() THEN false
      WHEN b.current_uses >= COALESCE(b.max_uses, 1) THEN false
      ELSE true
    END as is_valid,
    b.id as code_id,
    CASE 
      WHEN b.id IS NULL THEN 'invalid'
      WHEN b.is_active = false THEN 'inactive'
      WHEN b.expires_at IS NOT NULL AND b.expires_at <= now() THEN 'expired'
      WHEN b.current_uses >= COALESCE(b.max_uses, 1) THEN 'used'
      ELSE NULL
    END as error_message
  FROM beta_invite_codes b
  WHERE b.code = normalized_code;
  
  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'invalid'::text;
  END IF;
END;
$$;

-- 2. DROP THE OVERLY PERMISSIVE POLICY
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.beta_invite_codes;

-- 3. CONVERT VIEWS TO SECURITY INVOKER
-- This ensures views run with the caller's permissions, not the definer's
ALTER VIEW public.public_profiles SET (security_invoker = true);
ALTER VIEW public.public_businesses SET (security_invoker = true);
ALTER VIEW public.public_discounts SET (security_invoker = true);
ALTER VIEW public.event_rsvp_counts SET (security_invoker = true);
ALTER VIEW public.discount_scan_stats SET (security_invoker = true);
ALTER VIEW public.connection_stats_monitor SET (security_invoker = true);

-- 4. GRANT EXECUTE ON THE NEW FUNCTION TO PUBLIC
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO public;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO authenticated;