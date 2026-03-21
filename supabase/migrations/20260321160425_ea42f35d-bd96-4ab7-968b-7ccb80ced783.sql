-- Normalize guest identity (case/space insensitive)
CREATE OR REPLACE FUNCTION public.normalize_guest_identity(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(lower(trim(COALESCE(p_value, ''))), '\\s+', ' ', 'g'), '');
$$;

-- Centralized upsert helper for CRM guests
CREATE OR REPLACE FUNCTION public.upsert_crm_guest_identity(
  p_business_id uuid,
  p_user_id uuid,
  p_guest_name text,
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
  v_profile_exists boolean;
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

  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) INTO v_profile_exists;
    IF v_profile_exists THEN
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
  END IF;

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
    SET guest_name = COALESCE(v_name, guest_name),
        phone = COALESCE(v_phone, phone),
        email = COALESCE(NULLIF(trim(COALESCE(p_email, '')), ''), email),
        updated_at = now()
    WHERE id = v_guest_id;
  END IF;

  RETURN v_guest_id;
END;
$$;

-- Shared ticket sync logic (trigger + backfill)
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
  v_order_name text;
  v_order_phone text;
  v_order_email text;
  v_guest_name text;
  v_profile_exists boolean;
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

  IF COALESCE(p_ticket_status, '') NOT IN ('valid', 'used') THEN
    RETURN;
  END IF;

  SELECT o.customer_name, o.customer_phone, o.customer_email
  INTO v_order_name, v_order_phone, v_order_email
  FROM public.ticket_orders o
  WHERE o.id = p_order_id;

  v_guest_name := COALESCE(NULLIF(trim(COALESCE(p_guest_name, '')), ''), NULLIF(trim(COALESCE(v_order_name, '')), ''));

  v_effective_user_id := NULL;
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) INTO v_profile_exists;

    IF v_profile_exists THEN
      SELECT p.name,
             NULLIF(trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
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
  END IF;

  PERFORM public.upsert_crm_guest_identity(
    p_business_id,
    v_effective_user_id,
    v_guest_name,
    v_order_phone,
    COALESCE(v_profile_email, v_order_email),
    CASE WHEN v_effective_user_id IS NOT NULL THEN 'registered' ELSE 'ghost' END
  );
END;
$$;

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
    SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id) INTO v_profile_exists;
    IF v_profile_exists THEN
      v_effective_user_id := NEW.user_id;
    END IF;
  END IF;

  PERFORM public.upsert_crm_guest_identity(
    v_business_id,
    v_effective_user_id,
    NEW.reservation_name,
    NEW.phone_number,
    NULL,
    CASE WHEN v_effective_user_id IS NOT NULL THEN 'registered' ELSE 'ghost' END
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_crm_guest_from_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT e.business_id INTO v_business_id
  FROM public.events e
  WHERE e.id = NEW.event_id;

  PERFORM public.sync_crm_guest_from_ticket_data(
    v_business_id,
    NEW.user_id,
    NEW.order_id,
    NEW.guest_name,
    NEW.status::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_guest_from_reservation ON public.reservations;
CREATE TRIGGER trg_crm_guest_from_reservation
AFTER INSERT OR UPDATE OF user_id, reservation_name, phone_number, business_id, event_id
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_reservation();

DROP TRIGGER IF EXISTS trg_crm_guest_from_ticket ON public.tickets;
CREATE TRIGGER trg_crm_guest_from_ticket
AFTER INSERT OR UPDATE OF user_id, guest_name, event_id, order_id, status
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_ticket();

-- Backfill CRM guests with the same identity rules
CREATE OR REPLACE FUNCTION public.backfill_crm_guests(p_business_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_rec RECORD;
  res_rec RECORD;
  ticket_rec RECORD;
BEGIN
  FOR biz_rec IN
    SELECT b.id
    FROM public.businesses b
    WHERE p_business_id IS NULL OR b.id = p_business_id
  LOOP
    FOR res_rec IN
      SELECT
        r.user_id,
        r.reservation_name,
        r.phone_number,
        EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = r.user_id) AS profile_exists
      FROM public.reservations r
      LEFT JOIN public.events e ON e.id = r.event_id
      WHERE ((r.event_id IS NULL AND r.business_id = biz_rec.id) OR (r.event_id IS NOT NULL AND e.business_id = biz_rec.id))
    LOOP
      PERFORM public.upsert_crm_guest_identity(
        biz_rec.id,
        CASE WHEN res_rec.profile_exists THEN res_rec.user_id ELSE NULL END,
        res_rec.reservation_name,
        res_rec.phone_number,
        NULL,
        CASE WHEN res_rec.profile_exists THEN 'registered' ELSE 'ghost' END
      );
    END LOOP;

    FOR ticket_rec IN
      SELECT
        t.user_id,
        t.order_id,
        t.guest_name,
        t.status::text AS status_text
      FROM public.tickets t
      JOIN public.events e ON e.id = t.event_id
      WHERE e.business_id = biz_rec.id
    LOOP
      PERFORM public.sync_crm_guest_from_ticket_data(
        biz_rec.id,
        ticket_rec.user_id,
        ticket_rec.order_id,
        ticket_rec.guest_name,
        ticket_rec.status_text
      );
    END LOOP;
  END LOOP;
END;
$$;

SELECT public.backfill_crm_guests(NULL);