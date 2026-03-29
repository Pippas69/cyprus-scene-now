
-- Fix upsert_crm_guest_identity: NEVER auto-merge ghost profiles
-- Only the business owner can merge manually
CREATE OR REPLACE FUNCTION public.upsert_crm_guest_identity(
  p_business_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_profile_type text DEFAULT 'ghost'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guest_id uuid;
  v_name text;
  v_phone text;
  v_email text;
  v_profile_email text;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_name := NULLIF(trim(COALESCE(p_guest_name, '')), '');
  v_phone := NULLIF(trim(COALESCE(p_phone, '')), '');
  v_email := NULLIF(trim(COALESCE(p_email, '')), '');

  -- If user_id is provided, treat as registered (match by user_id - this is a unique identity)
  IF p_user_id IS NOT NULL THEN
    BEGIN
      SELECT au.email INTO v_profile_email
      FROM auth.users au
      WHERE au.id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_profile_email := NULL;
    END;

    SELECT cg.id INTO v_guest_id
    FROM public.crm_guests cg
    WHERE cg.business_id = p_business_id
      AND cg.user_id = p_user_id
    LIMIT 1;

    IF v_guest_id IS NULL THEN
      INSERT INTO public.crm_guests (business_id, user_id, guest_name, phone, email, profile_type)
      VALUES (
        p_business_id,
        p_user_id,
        COALESCE(v_name, 'Guest'),
        v_phone,
        COALESCE(v_email, v_profile_email),
        'registered'
      )
      RETURNING id INTO v_guest_id;
    ELSE
      UPDATE public.crm_guests
      SET guest_name = COALESCE(v_name, guest_name),
          phone = COALESCE(v_phone, phone),
          email = COALESCE(v_email, v_profile_email, email),
          profile_type = 'registered',
          updated_at = now()
      WHERE id = v_guest_id;
    END IF;

    RETURN v_guest_id;
  END IF;

  -- Ghost path: ALWAYS create a new record
  -- No auto-merging - only the business owner can merge manually
  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.crm_guests (business_id, user_id, guest_name, phone, email, profile_type)
  VALUES (
    p_business_id,
    NULL,
    v_name,
    v_phone,
    v_email,
    CASE WHEN p_profile_type IN ('ghost', 'merged') THEN p_profile_type ELSE 'ghost' END
  )
  RETURNING id INTO v_guest_id;

  RETURN v_guest_id;
END;
$function$;
