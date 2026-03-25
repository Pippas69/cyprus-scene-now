
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
SET search_path = public
AS $$
DECLARE
  v_guest_id uuid;
  v_name text;
  v_name_key text;
  v_phone text;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_name := NULLIF(trim(COALESCE(p_guest_name, '')), '');
  v_name_key := public.normalize_guest_identity(v_name);
  v_phone := NULLIF(trim(COALESCE(p_phone, '')), '');

  -- If user_id is provided, treat as registered (no profile lookup required)
  IF p_user_id IS NOT NULL THEN
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
        NULLIF(trim(COALESCE(p_email, '')), ''),
        'registered'
      )
      RETURNING id INTO v_guest_id;
    ELSE
      UPDATE public.crm_guests
      SET guest_name = COALESCE(v_name, guest_name),
          phone = COALESCE(v_phone, phone),
          email = COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), email),
          profile_type = 'registered',
          updated_at = now()
      WHERE id = v_guest_id;
    END IF;

    RETURN v_guest_id;
  END IF;

  -- Ghost path: no user_id provided
  IF v_name_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cg.id INTO v_guest_id
  FROM public.crm_guests cg
  WHERE cg.business_id = p_business_id
    AND cg.user_id IS NULL
    AND public.normalize_guest_identity(cg.guest_name) = v_name_key
    AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(v_phone, '')
  ORDER BY cg.created_at ASC
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO public.crm_guests (business_id, user_id, guest_name, phone, email, profile_type)
    VALUES (
      p_business_id,
      NULL,
      v_name,
      v_phone,
      NULLIF(trim(COALESCE(p_email, '')), ''),
      CASE WHEN p_profile_type IN ('ghost', 'merged') THEN p_profile_type ELSE 'ghost' END
    )
    RETURNING id INTO v_guest_id;
  ELSE
    UPDATE public.crm_guests
    SET phone = COALESCE(v_phone, phone),
        email = COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), email),
        updated_at = now()
    WHERE id = v_guest_id;
  END IF;

  RETURN v_guest_id;
END;
$$;
