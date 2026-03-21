
-- Fix backfill to only include users that exist in profiles (FK constraint)
CREATE OR REPLACE FUNCTION public.backfill_crm_guests(p_business_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_rec RECORD;
BEGIN
  FOR biz_rec IN SELECT id FROM businesses WHERE (p_business_id IS NULL OR id = p_business_id)
  LOOP
    -- Insert from reservations (registered users that exist in profiles)
    INSERT INTO crm_guests (business_id, user_id, guest_name, phone, email, profile_type)
    SELECT DISTINCT ON (r.user_id)
      biz_rec.id, r.user_id, r.reservation_name, r.phone_number, p.email, 'registered'
    FROM reservations r
    INNER JOIN profiles p ON r.user_id = p.id
    WHERE r.user_id IS NOT NULL
      AND (r.business_id = biz_rec.id OR r.event_id IN (SELECT id FROM events WHERE business_id = biz_rec.id))
      AND NOT EXISTS (SELECT 1 FROM crm_guests cg WHERE cg.business_id = biz_rec.id AND cg.user_id = r.user_id)
    ORDER BY r.user_id, r.created_at DESC
    ON CONFLICT DO NOTHING;

    -- Insert from ticket_orders (registered users that exist in profiles)
    INSERT INTO crm_guests (business_id, user_id, guest_name, phone, email, profile_type)
    SELECT DISTINCT ON (t.user_id)
      biz_rec.id, t.user_id, t.customer_name, t.customer_phone, t.customer_email, 'registered'
    FROM ticket_orders t
    INNER JOIN profiles p ON t.user_id = p.id
    WHERE t.user_id IS NOT NULL
      AND t.business_id = biz_rec.id
      AND t.status = 'completed'
      AND NOT EXISTS (SELECT 1 FROM crm_guests cg WHERE cg.business_id = biz_rec.id AND cg.user_id = t.user_id)
    ORDER BY t.user_id, t.created_at DESC
    ON CONFLICT DO NOTHING;

    -- Ghost profiles (no user_id)
    INSERT INTO crm_guests (business_id, user_id, guest_name, phone, profile_type)
    SELECT DISTINCT ON (r.reservation_name, COALESCE(r.phone_number, ''))
      biz_rec.id, NULL, r.reservation_name, r.phone_number, 'ghost'
    FROM reservations r
    WHERE r.user_id IS NULL
      AND (r.business_id = biz_rec.id OR r.event_id IN (SELECT id FROM events WHERE business_id = biz_rec.id))
      AND NOT EXISTS (
        SELECT 1 FROM crm_guests cg 
        WHERE cg.business_id = biz_rec.id AND cg.user_id IS NULL 
          AND cg.guest_name = r.reservation_name
          AND COALESCE(cg.phone, '') = COALESCE(r.phone_number, '')
      )
    ORDER BY r.reservation_name, COALESCE(r.phone_number, ''), r.created_at DESC
    ON CONFLICT DO NOTHING;

    -- Also create ghost profiles for orphaned reservations (user deleted from profiles)
    INSERT INTO crm_guests (business_id, user_id, guest_name, phone, profile_type)
    SELECT DISTINCT ON (r.reservation_name, COALESCE(r.phone_number, ''))
      biz_rec.id, NULL, r.reservation_name, r.phone_number, 'ghost'
    FROM reservations r
    WHERE r.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = r.user_id)
      AND (r.business_id = biz_rec.id OR r.event_id IN (SELECT id FROM events WHERE business_id = biz_rec.id))
      AND NOT EXISTS (
        SELECT 1 FROM crm_guests cg 
        WHERE cg.business_id = biz_rec.id AND cg.user_id IS NULL 
          AND cg.guest_name = r.reservation_name
          AND COALESCE(cg.phone, '') = COALESCE(r.phone_number, '')
      )
    ORDER BY r.reservation_name, COALESCE(r.phone_number, ''), r.created_at DESC
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Also fix the trigger to check profile exists
CREATE OR REPLACE FUNCTION public.auto_create_crm_guest_from_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_profile_exists boolean;
BEGIN
  IF NEW.business_id IS NOT NULL THEN
    v_business_id := NEW.business_id;
  ELSIF NEW.event_id IS NOT NULL THEN
    SELECT business_id INTO v_business_id FROM events WHERE id = NEW.event_id;
  END IF;
  IF v_business_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.user_id) INTO v_profile_exists;
    IF v_profile_exists THEN
      INSERT INTO crm_guests (business_id, user_id, guest_name, phone, profile_type)
      VALUES (v_business_id, NEW.user_id, NEW.reservation_name, NEW.phone_number, 'registered')
      ON CONFLICT DO NOTHING;
      UPDATE crm_guests SET guest_name = COALESCE(NEW.reservation_name, guest_name),
        phone = COALESCE(NEW.phone_number, phone), updated_at = now()
      WHERE business_id = v_business_id AND user_id = NEW.user_id;
    ELSE
      INSERT INTO crm_guests (business_id, user_id, guest_name, phone, profile_type)
      VALUES (v_business_id, NULL, NEW.reservation_name, NEW.phone_number, 'ghost')
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    INSERT INTO crm_guests (business_id, user_id, guest_name, phone, profile_type)
    VALUES (v_business_id, NULL, NEW.reservation_name, NEW.phone_number, 'ghost')
    ON CONFLICT DO NOTHING;
  END IF;
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
  v_profile_exists boolean;
BEGIN
  IF NEW.status <> 'completed' OR NEW.user_id IS NULL OR NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.user_id) INTO v_profile_exists;
  IF NOT v_profile_exists THEN RETURN NEW; END IF;

  INSERT INTO crm_guests (business_id, user_id, guest_name, phone, email, profile_type)
  VALUES (NEW.business_id, NEW.user_id, NEW.customer_name, NEW.customer_phone, NEW.customer_email, 'registered')
  ON CONFLICT DO NOTHING;
  UPDATE crm_guests SET guest_name = COALESCE(NEW.customer_name, guest_name),
    email = COALESCE(NEW.customer_email, email), phone = COALESCE(NEW.customer_phone, phone), updated_at = now()
  WHERE business_id = NEW.business_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Run backfill
SELECT backfill_crm_guests(NULL);
