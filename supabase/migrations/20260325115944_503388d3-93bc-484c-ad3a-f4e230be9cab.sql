
-- Fix sync_crm_guest_from_ticket_data: ghost profiles should NOT inherit booker's email/phone
CREATE OR REPLACE FUNCTION public.sync_crm_guest_from_ticket_data(
  p_business_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_guest_name text,
  p_ticket_status text
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
  v_guest_name_key text;
  v_profile_name_key text;
  v_profile_full_name_key text;
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

    v_guest_name_key := public.normalize_guest_identity(v_guest_name);
    v_profile_name_key := public.normalize_guest_identity(v_profile_name);
    v_profile_full_name_key := public.normalize_guest_identity(v_profile_full_name);

    IF v_guest_name_key IS NULL
       OR v_guest_name_key = v_profile_name_key
       OR v_guest_name_key = v_profile_full_name_key THEN
      v_effective_user_id := p_user_id;
    END IF;
  END IF;

  -- CRITICAL: Ghost profiles must NOT inherit the booker's email/phone.
  -- Only pass email/phone when the guest IS the registered user.
  IF v_effective_user_id IS NOT NULL THEN
    -- This IS the account holder - pass their real contact info
    PERFORM public.upsert_crm_guest_identity(
      p_business_id,
      v_effective_user_id,
      v_guest_name,
      v_order_phone,
      COALESCE(v_profile_email, v_order_email),
      'registered'
    );
  ELSE
    -- This is a guest (friend of the booker) - only pass their name
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

-- Fix auto_create_crm_guest_from_reservation: check name match before treating as registered
CREATE OR REPLACE FUNCTION public.auto_create_crm_guest_from_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_profile_exists boolean;
  v_effective_user_id uuid;
  v_profile_name text;
  v_profile_full_name text;
  v_guest_name_key text;
  v_profile_name_key text;
  v_profile_full_name_key text;
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
  IF NEW.user_id IS NOT NULL THEN
    SELECT p.first_name, concat_ws(' ', p.first_name, p.last_name)
    INTO v_profile_name, v_profile_full_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    IF v_profile_name IS NOT NULL THEN
      v_guest_name_key := public.normalize_guest_identity(NEW.reservation_name);
      v_profile_name_key := public.normalize_guest_identity(v_profile_name);
      v_profile_full_name_key := public.normalize_guest_identity(v_profile_full_name);

      IF v_guest_name_key IS NULL
         OR v_guest_name_key = v_profile_name_key
         OR v_guest_name_key = v_profile_full_name_key THEN
        v_effective_user_id := NEW.user_id;
      END IF;
    END IF;
  END IF;

  IF v_effective_user_id IS NOT NULL THEN
    -- This IS the account holder
    PERFORM public.upsert_crm_guest_identity(
      v_business_id,
      v_effective_user_id,
      NEW.reservation_name,
      NEW.phone_number,
      NULL,
      'registered'
    );
  ELSE
    -- Guest booked by someone else - don't pass booker's phone
    PERFORM public.upsert_crm_guest_identity(
      v_business_id,
      NULL,
      NEW.reservation_name,
      NULL,
      NULL,
      'ghost'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Clean up: remove booker's email/phone from ghost profiles
UPDATE public.crm_guests
SET email = NULL, phone = NULL, updated_at = now()
WHERE profile_type = 'ghost'
  AND user_id IS NULL
  AND (email IS NOT NULL OR phone IS NOT NULL);
