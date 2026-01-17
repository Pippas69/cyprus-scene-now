
-- Create a secure RPC function that calculates audience demographics for a business
-- This bypasses RLS safely by running as SECURITY DEFINER and only returning aggregated data

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
  -- Get the current user
  v_user_id := auth.uid();
  
  -- Verify the user owns this business
  IF NOT EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = p_business_id AND user_id = v_user_id
  ) THEN
    -- Also allow admins
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
  
  -- Calculate demographics from all visits
  WITH all_visits AS (
    -- Ticket check-ins
    SELECT t.user_id, 1 as visit_count
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.business_id = p_business_id
      AND t.checked_in_at IS NOT NULL
      AND t.checked_in_at >= v_start_date
      AND t.checked_in_at <= v_end_date
    
    UNION ALL
    
    -- Offer redemptions
    SELECT op.user_id, 1 as visit_count
    FROM offer_purchases op
    JOIN discounts d ON op.discount_id = d.id
    WHERE d.business_id = p_business_id
      AND op.redeemed_at IS NOT NULL
      AND op.redeemed_at >= v_start_date
      AND op.redeemed_at <= v_end_date
    
    UNION ALL
    
    -- Reservation check-ins
    SELECT r.user_id, 1 as visit_count
    FROM reservations r
    WHERE r.business_id = p_business_id
      AND r.checked_in_at IS NOT NULL
      AND r.checked_in_at >= v_start_date
      AND r.checked_in_at <= v_end_date
  ),
  user_visit_counts AS (
    SELECT user_id, SUM(visit_count) as weight
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
      COALESCE(p.city, p.town) as location
    FROM user_visit_counts uvc
    JOIN profiles p ON p.id = uvc.user_id
  ),
  gender_stats AS (
    SELECT 
      COALESCE(SUM(CASE 
        WHEN LOWER(gender) IN ('male', 'm', 'άνδρας', 'αρσενικό') THEN weight 
        ELSE 0 
      END), 0) as male,
      COALESCE(SUM(CASE 
        WHEN LOWER(gender) IN ('female', 'f', 'γυναίκα', 'θηλυκό') THEN weight 
        ELSE 0 
      END), 0) as female,
      COALESCE(SUM(CASE 
        WHEN gender IS NULL OR LOWER(gender) NOT IN ('male', 'm', 'άνδρας', 'αρσενικό', 'female', 'f', 'γυναίκα', 'θηλυκό') THEN weight 
        ELSE 0 
      END), 0) as other
    FROM demographics
  ),
  age_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN age >= 18 AND age <= 24 THEN weight ELSE 0 END), 0) as "18-24",
      COALESCE(SUM(CASE WHEN age >= 25 AND age <= 34 THEN weight ELSE 0 END), 0) as "25-34",
      COALESCE(SUM(CASE WHEN age >= 35 AND age <= 44 THEN weight ELSE 0 END), 0) as "35-44",
      COALESCE(SUM(CASE WHEN age >= 45 AND age <= 54 THEN weight ELSE 0 END), 0) as "45-54",
      COALESCE(SUM(CASE WHEN age >= 55 THEN weight ELSE 0 END), 0) as "55+",
      COALESCE(SUM(CASE WHEN age IS NULL OR age < 18 THEN weight ELSE 0 END), 0) as unknown
    FROM demographics
  ),
  region_stats AS (
    SELECT 
      COALESCE(location, 'Άγνωστο') as region_name,
      SUM(weight) as count
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_audience_demographics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
