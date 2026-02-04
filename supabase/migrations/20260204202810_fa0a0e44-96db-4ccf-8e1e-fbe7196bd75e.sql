-- Fix RLS recursion on student_discount_redemptions by avoiding joins to businesses inside policies
-- (joins can recurse depending on other RLS policies)

CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.user_id = auth.uid()
  );
$$;

-- Re-create policies using the helper (prevents recursion + restores metrics)
DROP POLICY IF EXISTS "Business owners can view and create redemptions" ON public.student_discount_redemptions;
DROP POLICY IF EXISTS "Business owners can create redemptions" ON public.student_discount_redemptions;

CREATE POLICY "Business owners can view and create redemptions"
ON public.student_discount_redemptions
FOR SELECT
USING (public.is_business_owner(business_id));

CREATE POLICY "Business owners can create redemptions"
ON public.student_discount_redemptions
FOR INSERT
WITH CHECK (public.is_business_owner(business_id));

-- Secure RPC for customer metrics: resolve student verification -> student user_id server-side
CREATE OR REPLACE FUNCTION public.get_student_discount_checkins(
  p_business_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(user_id uuid, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_start := COALESCE(p_start_date, date_trunc('month', now()));
  v_end := COALESCE(p_end_date, (date_trunc('month', now()) + interval '1 month' - interval '1 millisecond'));

  RETURN QUERY
  SELECT sv.user_id, sdr.created_at
  FROM public.student_discount_redemptions sdr
  JOIN public.student_verifications sv
    ON sv.id = sdr.student_verification_id
  WHERE sdr.business_id = p_business_id
    AND sdr.created_at >= v_start
    AND sdr.created_at <= v_end;
END;
$$;