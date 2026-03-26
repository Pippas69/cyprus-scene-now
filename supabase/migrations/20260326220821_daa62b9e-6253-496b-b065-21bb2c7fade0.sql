
-- Function to propagate a CRM guest name change to reservation_guests
-- This ensures stats resolution (which uses name matching) stays consistent
CREATE OR REPLACE FUNCTION public.propagate_crm_guest_rename(
  p_business_id uuid,
  p_old_name text,
  p_new_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_key text;
  v_new_key text;
BEGIN
  v_old_key := public.normalize_guest_identity(p_old_name);
  v_new_key := public.normalize_guest_identity(p_new_name);
  
  -- Skip if normalized names are the same
  IF v_old_key IS NOT NULL AND v_old_key = v_new_key THEN
    RETURN;
  END IF;
  
  -- Update reservation_guests where the name matches the old name
  -- Only for reservations belonging to this business
  UPDATE public.reservation_guests rg
  SET guest_name = p_new_name
  FROM public.reservations r
  WHERE rg.reservation_id = r.id
    AND r.business_id = p_business_id
    AND public.normalize_guest_identity(rg.guest_name) = v_old_key;
    
  -- Also update reservations.reservation_name if it matches (for main booker)
  UPDATE public.reservations r
  SET reservation_name = p_new_name
  WHERE r.business_id = p_business_id
    AND public.normalize_guest_identity(r.reservation_name) = v_old_key
    AND r.user_id IS NULL;  -- only for non-registered users
END;
$$;
