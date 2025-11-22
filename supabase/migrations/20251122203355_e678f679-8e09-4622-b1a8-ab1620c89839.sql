-- Update get_business_analytics function to include currentFollowers in overview
CREATE OR REPLACE FUNCTION public.get_business_analytics(
  p_business_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_reach integer;
  v_total_impressions integer;
  v_engagement_rate numeric;
  v_follower_start integer;
  v_follower_end integer;
  v_follower_growth numeric;
  v_conversion_rate numeric;
  v_result json;
BEGIN
  -- Calculate total reach (unique event viewers)
  SELECT COUNT(DISTINCT user_id)
  INTO v_total_reach
  FROM event_views ev
  JOIN events e ON ev.event_id = e.id
  WHERE e.business_id = p_business_id
    AND ev.viewed_at BETWEEN p_start_date AND p_end_date
    AND ev.user_id IS NOT NULL;

  -- Calculate total impressions (total event views + discount views)
  SELECT 
    COALESCE(ev_count, 0) + COALESCE(dv_count, 0)
  INTO v_total_impressions
  FROM (
    SELECT COUNT(*) as ev_count
    FROM event_views ev
    JOIN events e ON ev.event_id = e.id
    WHERE e.business_id = p_business_id
      AND ev.viewed_at BETWEEN p_start_date AND p_end_date
  ) event_views_count,
  (
    SELECT COUNT(*) as dv_count
    FROM discount_views dv
    JOIN discounts d ON dv.discount_id = d.id
    WHERE d.business_id = p_business_id
      AND dv.viewed_at BETWEEN p_start_date AND p_end_date
  ) discount_views_count;

  -- Calculate engagement rate (interactions / impressions * 100)
  WITH total_interactions AS (
    SELECT COUNT(*) as count
    FROM (
      SELECT user_id FROM business_followers 
      WHERE business_id = p_business_id 
        AND created_at BETWEEN p_start_date AND p_end_date
      UNION ALL
      SELECT user_id FROM rsvps r
      JOIN events e ON r.event_id = e.id
      WHERE e.business_id = p_business_id
        AND r.created_at BETWEEN p_start_date AND p_end_date
      UNION ALL
      SELECT user_id FROM favorites f
      JOIN events e ON f.event_id = e.id
      WHERE e.business_id = p_business_id
        AND f.created_at BETWEEN p_start_date AND p_end_date
    ) interactions
  )
  SELECT 
    CASE 
      WHEN v_total_impressions > 0 
      THEN (count::numeric / v_total_impressions::numeric * 100)
      ELSE 0
    END
  INTO v_engagement_rate
  FROM total_interactions;

  -- Calculate follower growth
  SELECT COUNT(*) INTO v_follower_start
  FROM business_followers
  WHERE business_id = p_business_id
    AND created_at < p_start_date
    AND (unfollowed_at IS NULL OR unfollowed_at >= p_start_date);

  SELECT COUNT(*) INTO v_follower_end
  FROM business_followers
  WHERE business_id = p_business_id
    AND created_at < p_end_date
    AND (unfollowed_at IS NULL OR unfollowed_at >= p_end_date);

  IF v_follower_start > 0 THEN
    v_follower_growth := ((v_follower_end - v_follower_start)::numeric / v_follower_start::numeric * 100);
  ELSE
    v_follower_growth := 0;
  END IF;

  -- Calculate conversion rate (going / interested * 100)
  WITH rsvp_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'interested') as interested_count,
      COUNT(*) FILTER (WHERE status = 'going') as going_count
    FROM rsvps r
    JOIN events e ON r.event_id = e.id
    WHERE e.business_id = p_business_id
      AND r.created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    CASE 
      WHEN interested_count > 0 
      THEN (going_count::numeric / interested_count::numeric * 100)
      ELSE 0
    END
  INTO v_conversion_rate
  FROM rsvp_counts;

  -- Build the result JSON
  SELECT json_build_object(
    'overview', json_build_object(
      'totalReach', COALESCE(v_total_reach, 0),
      'totalImpressions', COALESCE(v_total_impressions, 0),
      'engagementRate', COALESCE(v_engagement_rate, 0),
      'followerGrowth', COALESCE(v_follower_growth, 0),
      'conversionRate', COALESCE(v_conversion_rate, 0),
      'currentFollowers', COALESCE(v_follower_end, 0)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;