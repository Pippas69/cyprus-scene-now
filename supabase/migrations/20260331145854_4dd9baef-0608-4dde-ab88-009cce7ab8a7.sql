
CREATE OR REPLACE FUNCTION public.get_audience_demographics(
  p_business_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id AND user_id = v_user_id
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: You do not own this business';
    END IF;
  END IF;

  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '1 year');
  v_end_date := COALESCE(p_end_date, NOW());

  WITH raw_visits AS (
    -- Tickets (both registered users and manual entries)
    SELECT
      t.id AS record_id,
      t.user_id,
      t.guest_age AS ticket_guest_age,
      t.guest_city AS ticket_guest_city
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.business_id = p_business_id
      AND t.created_at >= v_start_date
      AND t.created_at <= v_end_date
      AND t.status IN ('valid', 'used')

    UNION ALL

    -- Offer purchases
    SELECT
      op.id AS record_id,
      op.user_id,
      NULL::integer AS ticket_guest_age,
      NULL::text AS ticket_guest_city
    FROM offer_purchases op
    WHERE op.business_id = p_business_id
      AND op.created_at >= v_start_date
      AND op.created_at <= v_end_date
      AND op.status != 'cancelled'

    UNION ALL

    -- Reservations (excluding auto-created, offer-linked, ticket-linked)
    SELECT
      r.id AS record_id,
      r.user_id,
      NULL::integer AS ticket_guest_age,
      NULLIF(TRIM(COALESCE(r.guest_city, '')), '') AS ticket_guest_city
    FROM reservations r
    LEFT JOIN events e ON r.event_id = e.id
    WHERE (r.business_id = p_business_id OR e.business_id = p_business_id)
      AND r.created_at >= v_start_date
      AND r.created_at <= v_end_date
      AND r.status != 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM offer_purchases op2
        WHERE op2.reservation_id = r.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM ticket_orders tor
        WHERE tor.linked_reservation_id = r.id
      )
      AND NOT (LOWER(COALESCE(r.special_requests, '')) LIKE '%offer claim:%')
      AND COALESCE(r.auto_created_from_tickets, false) = false

    UNION ALL

    -- Student discount redemptions
    SELECT
      sdr.id AS record_id,
      sv.user_id,
      NULL::integer AS ticket_guest_age,
      NULL::text AS ticket_guest_city
    FROM student_discount_redemptions sdr
    JOIN student_verifications sv ON sdr.student_verification_id = sv.id
    WHERE sdr.business_id = p_business_id
      AND sdr.created_at >= v_start_date
      AND sdr.created_at <= v_end_date
  ),
  demographics AS (
    SELECT
      -- Gender: only from profile (only full FOMO signup provides gender)
      CASE
        WHEN rv.user_id IS NOT NULL THEN p.gender
        ELSE NULL
      END AS gender,
      -- Age: profile first, then ticket guest_age fallback
      COALESCE(p.age, rv.ticket_guest_age) AS age,
      -- City: profile first, then ticket/reservation guest_city fallback
      COALESCE(
        NULLIF(TRIM(COALESCE(p.city, '')), ''),
        NULLIF(TRIM(COALESCE(p.town, '')), ''),
        NULLIF(TRIM(COALESCE(rv.ticket_guest_city, '')), '')
      ) AS location
    FROM raw_visits rv
    LEFT JOIN profiles p ON p.id = rv.user_id
  ),
  gender_stats AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN LOWER(gender) IN ('male', 'm', 'άνδρας', 'αρσενικό') THEN 1 ELSE 0
      END), 0) AS male,
      COALESCE(SUM(CASE
        WHEN LOWER(gender) IN ('female', 'f', 'γυναίκα', 'θηλυκό') THEN 1 ELSE 0
      END), 0) AS female,
      COALESCE(SUM(CASE
        WHEN gender IS NULL OR LOWER(gender) NOT IN ('male', 'm', 'άνδρας', 'αρσενικό', 'female', 'f', 'γυναίκα', 'θηλυκό') THEN 1 ELSE 0
      END), 0) AS other
    FROM demographics
  ),
  age_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN age >= 18 AND age <= 24 THEN 1 ELSE 0 END), 0) AS "18-24",
      COALESCE(SUM(CASE WHEN age >= 25 AND age <= 34 THEN 1 ELSE 0 END), 0) AS "25-34",
      COALESCE(SUM(CASE WHEN age >= 35 AND age <= 44 THEN 1 ELSE 0 END), 0) AS "35-44",
      COALESCE(SUM(CASE WHEN age >= 45 THEN 1 ELSE 0 END), 0) AS "45+"
    FROM demographics
  ),
  city_stats AS (
    SELECT COALESCE(json_object_agg(location, total_count), '{}'::json) AS cities
    FROM (
      SELECT location, COUNT(*)::bigint AS total_count
      FROM demographics
      WHERE location IS NOT NULL AND location <> ''
      GROUP BY location
      ORDER BY total_count DESC
    ) all_cities
  )
  SELECT json_build_object(
    'gender', json_build_object(
      'male', gs.male,
      'female', gs.female,
      'other', gs.other
    ),
    'age', json_build_object(
      '18-24', "18-24",
      '25-34', "25-34",
      '35-44', "35-44",
      '45+', "45+"
    ),
    'cities', cs.cities
  ) INTO v_result
  FROM gender_stats gs, age_stats, city_stats cs;

  RETURN COALESCE(v_result, json_build_object(
    'gender', json_build_object('male', 0, 'female', 0, 'other', 0),
    'age', json_build_object('18-24', 0, '25-34', 0, '35-44', 0, '45+', 0),
    'cities', '{}'::json
  ));
END;
$function$;
