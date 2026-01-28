-- Add student discount redemptions to audience demographics
-- This ensures that visits from student check-ins are included in the audience demographics

CREATE OR REPLACE FUNCTION public.get_audience_demographics(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  -- Verify the user owns this business (or is admin)
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

  -- Default date range: last 1 year if not provided
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '1 year');
  v_end_date := COALESCE(p_end_date, NOW());

  WITH all_visits AS (
    -- 1) Ticket check-ins
    SELECT t.user_id, 1 AS visit_count
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.business_id = p_business_id
      AND t.checked_in_at IS NOT NULL
      AND t.checked_in_at >= v_start_date
      AND t.checked_in_at <= v_end_date

    UNION ALL

    -- 2) Offer redemptions (proxy for successful QR verification)
    SELECT op.user_id, 1 AS visit_count
    FROM offer_purchases op
    WHERE op.business_id = p_business_id
      AND op.redeemed_at IS NOT NULL
      AND op.redeemed_at >= v_start_date
      AND op.redeemed_at <= v_end_date

    UNION ALL

    -- 3) Reservation check-ins
    -- Includes:
    --   a) Direct reservations (reservations.business_id)
    --   b) Event reservations (reservations.event_id -> events.business_id)
    SELECT r.user_id, 1 AS visit_count
    FROM reservations r
    LEFT JOIN events e ON r.event_id = e.id
    WHERE (r.business_id = p_business_id OR e.business_id = p_business_id)
      AND r.checked_in_at IS NOT NULL
      AND r.checked_in_at >= v_start_date
      AND r.checked_in_at <= v_end_date

    UNION ALL

    -- 4) Student discount redemptions
    -- Get the user_id through the student_verifications table
    SELECT sv.user_id, 1 AS visit_count
    FROM student_discount_redemptions sdr
    JOIN student_verifications sv ON sdr.student_verification_id = sv.id
    WHERE sdr.business_id = p_business_id
      AND sdr.created_at >= v_start_date
      AND sdr.created_at <= v_end_date
  ),
  user_visit_counts AS (
    SELECT user_id, SUM(visit_count) AS weight
    FROM all_visits
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ),
  demographics AS (
    SELECT
      p.id,
      uvc.weight,
      p.gender,
      p.age,
      COALESCE(p.city, p.town) AS location
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
      COALESCE(SUM(CASE WHEN age >= 45 AND age <= 54 THEN weight ELSE 0 END), 0) AS "45-54",
      COALESCE(SUM(CASE WHEN age >= 55 THEN weight ELSE 0 END), 0) AS "55+",
      COALESCE(SUM(CASE WHEN age IS NULL OR age < 18 THEN weight ELSE 0 END), 0) AS unknown
    FROM demographics
  ),
  region_stats AS (
    SELECT
      COALESCE(location, 'Άγνωστο') AS region_name,
      SUM(weight) AS count
    FROM demographics
    GROUP BY COALESCE(location, 'Άγνωστο')
    ORDER BY count DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'gender', (SELECT json_build_object('male', male, 'female', female, 'other', other) FROM gender_stats),
    'age', (SELECT json_build_object(
      '18-24', "18-24",
      '25-34', "25-34",
      '35-44', "35-44",
      '45-54', "45-54",
      '55+', "55+",
      'Άγνωστο', unknown
    ) FROM age_stats),
    'region', (SELECT COALESCE(json_object_agg(region_name, count), '{}'::json) FROM region_stats)
  ) INTO v_result;

  RETURN v_result;
END;
$$;