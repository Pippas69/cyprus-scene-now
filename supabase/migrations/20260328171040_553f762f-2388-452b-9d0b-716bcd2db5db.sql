
-- Fix: Manual entries should NOT use the business owner's user_id for CRM.
-- The trigger auto_create_crm_guest_from_reservation uses user_id to look up profile name,
-- but for manual entries, user_id is the business owner, not the guest.
-- Fix: When is_manual_entry = true, always create a ghost profile with the entered name.

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

  -- For manual entries, ALWAYS create a ghost profile with the entered name
  -- Do NOT use user_id (which is the business owner)
  IF NEW.is_manual_entry = true THEN
    PERFORM public.upsert_crm_guest_identity(
      v_business_id,
      NULL,
      NEW.reservation_name,
      NEW.phone_number,
      NULL,
      'ghost'
    );
    RETURN NEW;
  END IF;

  v_effective_user_id := NULL;
  v_effective_name := NEW.reservation_name;

  IF NEW.user_id IS NOT NULL THEN
    SELECT p.first_name, concat_ws(' ', p.first_name, p.last_name)
    INTO v_profile_name, v_profile_full_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    v_effective_user_id := NEW.user_id;
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

-- Add columns for manual entry extra data
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS min_age integer;
