
-- Fix sync_crm_guest_from_ticket_data: always use user_id when present, use profile name
CREATE OR REPLACE FUNCTION public.sync_crm_guest_from_ticket_data(
  p_business_id uuid,
  p_user_id uuid,
  p_guest_name text,
  p_order_id uuid,
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
  v_profile_name text;
  v_profile_full_name text;
  v_profile_email text;
  v_effective_user_id uuid;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN;
  END IF;

  IF p_ticket_status = 'cancelled' THEN
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

  IF p_user_id IS NOT NULL THEN
    SELECT p.first_name,
           concat_ws(' ', p.first_name, p.last_name),
           p.email
    INTO v_profile_name, v_profile_full_name, v_profile_email
    FROM public.profiles p
    WHERE p.id = p_user_id;

    -- ALWAYS link to registered user when user_id exists, regardless of name
    v_effective_user_id := p_user_id;
    -- Use the real profile name, not the form name
    v_guest_name := COALESCE(NULLIF(trim(v_profile_full_name), ''), v_guest_name);
  END IF;

  IF v_effective_user_id IS NOT NULL THEN
    PERFORM public.upsert_crm_guest_identity(
      p_business_id,
      v_effective_user_id,
      v_guest_name,
      v_order_phone,
      COALESCE(v_profile_email, v_order_email),
      'registered'
    );
  ELSE
    PERFORM public.upsert_crm_guest_identity(
      p_business_id,
      NULL,
      v_guest_name,
      NULL,
      NULL,
      'ghost'
    );
  END IF;
END;
$$;

-- Fix auto_create_crm_guest_from_reservation: always use user_id when present, use profile name
CREATE OR REPLACE FUNCTION public.auto_create_crm_guest_from_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_effective_user_id uuid;
  v_profile_name text;
  v_profile_full_name text;
  v_effective_name text;
BEGIN
  IF NEW.business_id IS NOT NULL THEN
    v_business_id := NEW.business_id;
  ELSIF NEW.event_id IS NOT NULL THEN
    SELECT e.business_id INTO v_business_id
    FROM public.events e
    WHERE e.id = NEW.event_id;
  END IF;

  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_effective_user_id := NULL;
  v_effective_name := NEW.reservation_name;

  IF NEW.user_id IS NOT NULL THEN
    SELECT p.first_name, concat_ws(' ', p.first_name, p.last_name)
    INTO v_profile_name, v_profile_full_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    -- ALWAYS link to registered user when user_id exists, regardless of name
    v_effective_user_id := NEW.user_id;
    -- Use the real profile name, not the reservation form name
    v_effective_name := COALESCE(NULLIF(trim(v_profile_full_name), ''), NEW.reservation_name);
  END IF;

  IF v_effective_user_id IS NOT NULL THEN
    PERFORM public.upsert_crm_guest_identity(
      v_business_id,
      v_effective_user_id,
      v_effective_name,
      NEW.phone_number,
      NULL,
      'registered'
    );
  ELSE
    PERFORM public.upsert_crm_guest_identity(
      v_business_id,
      NULL,
      v_effective_name,
      NULL,
      NULL,
      'ghost'
    );
  END IF;

  RETURN NEW;
END;
$$;
