CREATE OR REPLACE FUNCTION public.resolve_crm_guest_for_ticket(
  p_business_id uuid,
  p_user_id uuid,
  p_guest_name text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name_key text;
  v_profile_first_name text;
  v_profile_name text;
  v_profile_full_name text;
  v_user_guest_id uuid;
  v_name_guest_id uuid;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_name_key := public.normalize_guest_identity(NULLIF(trim(COALESCE(p_guest_name, '')), ''));

  IF p_user_id IS NOT NULL THEN
    SELECT p.first_name, p.name, concat_ws(' ', p.first_name, p.last_name)
    INTO v_profile_first_name, v_profile_name, v_profile_full_name
    FROM public.profiles p
    WHERE p.id = p_user_id;

    SELECT cg.id
    INTO v_user_guest_id
    FROM public.crm_guests cg
    WHERE cg.business_id = p_business_id
      AND cg.user_id = p_user_id
    LIMIT 1;
  END IF;

  IF p_user_id IS NOT NULL
     AND v_name_key IS NOT NULL
     AND (
       v_name_key = public.normalize_guest_identity(v_profile_first_name)
       OR v_name_key = public.normalize_guest_identity(v_profile_name)
       OR v_name_key = public.normalize_guest_identity(v_profile_full_name)
     )
     AND v_user_guest_id IS NOT NULL THEN
    RETURN v_user_guest_id;
  END IF;

  IF v_name_key IS NOT NULL THEN
    SELECT cg.id
    INTO v_name_guest_id
    FROM public.crm_guests cg
    WHERE cg.business_id = p_business_id
      AND public.normalize_guest_identity(cg.guest_name) = v_name_key
    ORDER BY CASE WHEN cg.user_id IS NULL THEN 0 ELSE 1 END, cg.created_at ASC
    LIMIT 1;

    IF v_name_guest_id IS NOT NULL THEN
      RETURN v_name_guest_id;
    END IF;
  END IF;

  RETURN v_user_guest_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_crm_guest_from_ticket_data_core(
  p_business_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_guest_name text,
  p_ticket_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_name text;
  v_order_email text;
  v_order_phone text;
  v_profile_first_name text;
  v_profile_name text;
  v_profile_full_name text;
  v_profile_email text;
  v_profile_exists boolean;
  v_effective_user_id uuid;
  v_name_matches_profile boolean;
  v_guest_id uuid;
  v_merge_ghost_id uuid;
BEGIN
  IF p_business_id IS NULL OR p_ticket_status = 'cancelled' THEN
    RETURN;
  END IF;

  v_guest_name := NULLIF(trim(COALESCE(p_guest_name, '')), '');

  IF p_order_id IS NOT NULL THEN
    SELECT o.customer_email, o.customer_phone
    INTO v_order_email, v_order_phone
    FROM public.ticket_orders o
    WHERE o.id = p_order_id;
  END IF;

  v_effective_user_id := NULL;
  v_profile_exists := FALSE;

  IF p_user_id IS NOT NULL THEN
    SELECT p.first_name,
           p.name,
           concat_ws(' ', p.first_name, p.last_name),
           p.email
    INTO v_profile_first_name, v_profile_name, v_profile_full_name, v_profile_email
    FROM public.profiles p
    WHERE p.id = p_user_id;

    v_profile_exists := FOUND;

    IF v_profile_exists THEN
      v_name_matches_profile := (
        v_guest_name IS NULL
        OR public.normalize_guest_identity(v_guest_name) = public.normalize_guest_identity(v_profile_first_name)
        OR public.normalize_guest_identity(v_guest_name) = public.normalize_guest_identity(v_profile_name)
        OR public.normalize_guest_identity(v_guest_name) = public.normalize_guest_identity(v_profile_full_name)
      );

      IF v_name_matches_profile THEN
        v_effective_user_id := p_user_id;
        v_guest_name := COALESCE(
          NULLIF(trim(v_profile_full_name), ''),
          NULLIF(trim(v_profile_name), ''),
          NULLIF(trim(v_profile_first_name), ''),
          v_guest_name
        );
      END IF;
    END IF;
  END IF;

  IF v_effective_user_id IS NOT NULL THEN
    v_guest_id := public.upsert_crm_guest_identity(
      p_business_id,
      v_effective_user_id,
      v_guest_name,
      v_order_phone,
      COALESCE(v_profile_email, v_order_email),
      'registered'
    );

    IF v_guest_id IS NOT NULL THEN
      SELECT cg.id
      INTO v_merge_ghost_id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND cg.profile_type = 'ghost'
        AND cg.brought_by_user_id = p_user_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(v_guest_name)
      ORDER BY cg.created_at ASC
      LIMIT 1;

      IF v_merge_ghost_id IS NOT NULL AND v_merge_ghost_id <> v_guest_id THEN
        PERFORM public.merge_ghost_to_account(v_merge_ghost_id, v_guest_id, p_business_id);
      END IF;
    END IF;
  ELSE
    v_guest_id := public.upsert_crm_guest_identity(
      p_business_id,
      NULL,
      COALESCE(v_guest_name, 'Guest'),
      NULL,
      NULL,
      'ghost'
    );

    IF v_guest_id IS NOT NULL AND p_user_id IS NOT NULL THEN
      UPDATE public.crm_guests cg
      SET brought_by_user_id = COALESCE(cg.brought_by_user_id, p_user_id),
          updated_at = now()
      WHERE cg.id = v_guest_id
        AND cg.user_id IS NULL;
    END IF;
  END IF;
END;
$$;

DO $$
DECLARE
  rec RECORD;
  v_business_id uuid;
BEGIN
  FOR rec IN
    SELECT t.user_id, t.order_id, t.guest_name, t.status::text AS ticket_status, t.event_id
    FROM public.tickets t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    WHERE t.user_id IS NULL OR p.id IS NOT NULL
  LOOP
    SELECT e.business_id INTO v_business_id
    FROM public.events e
    WHERE e.id = rec.event_id;

    PERFORM public.sync_crm_guest_from_ticket_data_core(
      v_business_id,
      rec.user_id,
      rec.order_id,
      rec.guest_name,
      rec.ticket_status
    );
  END LOOP;
END;
$$;