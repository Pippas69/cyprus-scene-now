
-- Update get_audience_demographics to count ALL customers, not just checked-in ones
DROP FUNCTION IF EXISTS public.get_audience_demographics(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_audience_demographics(
  p_business_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
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
    -- Tickets: any ticket (valid or used), not just checked-in
    SELECT t.user_id, t.event_id AS visit_event_id
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.business_id = p_business_id
      AND t.created_at >= v_start_date
      AND t.created_at <= v_end_date
      AND t.status IN ('valid', 'used')

    UNION ALL

    -- Offer purchases: any purchase (not just redeemed)
    SELECT op.user_id, NULL::uuid AS visit_event_id
    FROM offer_purchases op
    WHERE op.business_id = p_business_id
      AND op.created_at >= v_start_date
      AND op.created_at <= v_end_date
      AND op.status != 'cancelled'

    UNION ALL

    -- Reservations: any reservation (not just checked-in), excluding cancelled
    SELECT r.user_id, r.event_id AS visit_event_id
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
    SELECT sv.user_id, NULL::uuid AS visit_event_id
    FROM student_discount_redemptions sdr
    JOIN student_verifications sv ON sdr.student_verification_id = sv.id
    WHERE sdr.business_id = p_business_id
      AND sdr.created_at >= v_start_date
      AND sdr.created_at <= v_end_date
  ),
  deduped_visits AS (
    SELECT DISTINCT ON (user_id, COALESCE(visit_event_id, gen_random_uuid()))
      user_id, 1 AS visit_count
    FROM raw_visits
    WHERE user_id IS NOT NULL
  ),
  user_visit_counts AS (
    SELECT user_id, SUM(visit_count) AS weight
    FROM deduped_visits
    GROUP BY user_id
  ),
  demographics AS (
    SELECT
      p.id,
      uvc.weight,
      p.gender,
      p.age,
      COALESCE(NULLIF(TRIM(p.city), ''), NULLIF(TRIM(p.town), '')) AS location
    FROM user_visit_counts uvc
    JOIN profiles p ON p.id = uvc.user_id
  ),
  gender_stats AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN LOWER(gender) IN ('male', 'm', 'άνδρας', 'αρσενικό') THEN weight
        ELSE 0
      END), 0) AS male,
      COALESCE(SUM(CASE
        WHEN LOWER(gender) IN ('female', 'f', 'γυναίκα', 'θηλυκό') THEN weight
        ELSE 0
      END), 0) AS female,
      COALESCE(SUM(CASE
        WHEN gender IS NULL OR LOWER(gender) NOT IN ('male', 'm', 'άνδρας', 'αρσενικό', 'female', 'f', 'γυναίκα', 'θηλυκό') THEN weight
        ELSE 0
      END), 0) AS other
    FROM demographics
  ),
  age_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN age >= 18 AND age <= 24 THEN weight ELSE 0 END), 0) AS "18-24",
      COALESCE(SUM(CASE WHEN age >= 25 AND age <= 34 THEN weight ELSE 0 END), 0) AS "25-34",
      COALESCE(SUM(CASE WHEN age >= 35 AND age <= 44 THEN weight ELSE 0 END), 0) AS "35-44",
      COALESCE(SUM(CASE WHEN age >= 45 THEN weight ELSE 0 END), 0) AS "45+"
    FROM demographics
  ),
  city_stats AS (
    SELECT COALESCE(json_object_agg(location, total_weight), '{}'::json) AS cities
    FROM (
      SELECT location, SUM(weight)::bigint AS total_weight
      FROM demographics
      WHERE location IS NOT NULL AND location <> ''
      GROUP BY location
      ORDER BY total_weight DESC
      LIMIT 6
    ) top_cities
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

GRANT EXECUTE ON FUNCTION public.get_audience_demographics TO authenticated, service_role;
