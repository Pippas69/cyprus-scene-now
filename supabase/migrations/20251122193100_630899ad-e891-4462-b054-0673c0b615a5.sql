-- Fix security warning: Add search_path to function
DROP FUNCTION IF EXISTS get_business_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_business_analytics(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_total_impressions BIGINT;
  v_total_reach BIGINT;
  v_follower_start BIGINT;
  v_follower_end BIGINT;
BEGIN
  -- Calculate total impressions (event views + discount views)
  SELECT 
    COALESCE(SUM(ev_count), 0) + COALESCE(SUM(dv_count), 0) as total_impressions,
    COUNT(DISTINCT COALESCE(ev_user, dv_user)) as total_reach
  INTO v_total_impressions, v_total_reach
  FROM (
    SELECT COUNT(*) as ev_count, user_id as ev_user, NULL::UUID as dv_user
    FROM event_views ev
    JOIN events e ON e.id = ev.event_id
    WHERE e.business_id = p_business_id 
      AND ev.viewed_at BETWEEN p_start_date AND p_end_date
    GROUP BY ev_user
    
    UNION ALL
    
    SELECT COUNT(*) as ev_count, NULL::UUID as ev_user, user_id as dv_user
    FROM discount_views dv
    JOIN discounts d ON d.id = dv.discount_id
    WHERE d.business_id = p_business_id 
      AND dv.viewed_at BETWEEN p_start_date AND p_end_date
    GROUP BY dv_user
  ) combined;

  -- Get follower counts for growth calculation
  SELECT COUNT(*) INTO v_follower_start
  FROM business_followers
  WHERE business_id = p_business_id
    AND created_at < p_start_date
    AND (unfollowed_at IS NULL OR unfollowed_at >= p_start_date);

  SELECT COUNT(*) INTO v_follower_end
  FROM business_followers
  WHERE business_id = p_business_id
    AND created_at <= p_end_date
    AND (unfollowed_at IS NULL OR unfollowed_at > p_end_date);

  -- Build complete analytics JSON
  SELECT json_build_object(
    'overview', json_build_object(
      'totalReach', COALESCE(v_total_reach, 0),
      'totalImpressions', COALESCE(v_total_impressions, 0),
      'engagementRate', CASE 
        WHEN v_total_impressions > 0 
        THEN ROUND((v_total_reach::NUMERIC / v_total_impressions * 100)::NUMERIC, 2)
        ELSE 0 
      END,
      'followerGrowth', CASE
        WHEN v_follower_start > 0
        THEN ROUND(((v_follower_end - v_follower_start)::NUMERIC / v_follower_start * 100)::NUMERIC, 2)
        ELSE 0
      END,
      'conversionRate', COALESCE((
        SELECT ROUND((COUNT(DISTINCT user_id)::NUMERIC / NULLIF(v_total_reach, 0) * 100)::NUMERIC, 2)
        FROM rsvps r
        JOIN events e ON e.id = r.event_id
        WHERE e.business_id = p_business_id
          AND r.created_at BETWEEN p_start_date AND p_end_date
      ), 0)
    ),
    'eventPerformance', COALESCE((
      SELECT json_agg(event_data ORDER BY views DESC)
      FROM (
        SELECT 
          e.id,
          e.title,
          e.start_at,
          COUNT(DISTINCT ev.id) as views,
          COUNT(DISTINCT ev.user_id) as unique_viewers,
          COUNT(DISTINCT CASE WHEN r.status = 'going' THEN r.user_id END) as rsvps_going,
          COUNT(DISTINCT CASE WHEN r.status = 'interested' THEN r.user_id END) as rsvps_interested,
          COUNT(DISTINCT res.id) as reservations,
          CASE 
            WHEN COUNT(DISTINCT ev.id) > 0 
            THEN ROUND((COUNT(DISTINCT r.user_id)::NUMERIC / COUNT(DISTINCT ev.id) * 100)::NUMERIC, 2)
            ELSE 0 
          END as conversion_rate
        FROM events e
        LEFT JOIN event_views ev ON ev.event_id = e.id 
          AND ev.viewed_at BETWEEN p_start_date AND p_end_date
        LEFT JOIN rsvps r ON r.event_id = e.id 
          AND r.created_at BETWEEN p_start_date AND p_end_date
        LEFT JOIN reservations res ON res.event_id = e.id 
          AND res.created_at BETWEEN p_start_date AND p_end_date
        WHERE e.business_id = p_business_id
        GROUP BY e.id, e.title, e.start_at
      ) event_data
    ), '[]'::json),
    'discountPerformance', COALESCE((
      SELECT json_agg(discount_data ORDER BY views DESC)
      FROM (
        SELECT 
          d.id,
          d.title,
          COUNT(DISTINCT dv.id) as views,
          COUNT(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'view') as scans,
          COUNT(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'verify') as verifications,
          COUNT(DISTINCT r.id) as redemptions,
          CASE 
            WHEN COUNT(DISTINCT dv.id) > 0 
            THEN ROUND((COUNT(DISTINCT r.id)::NUMERIC / COUNT(DISTINCT dv.id) * 100)::NUMERIC, 2)
            ELSE 0 
          END as conversion_rate
        FROM discounts d
        LEFT JOIN discount_views dv ON dv.discount_id = d.id 
          AND dv.viewed_at BETWEEN p_start_date AND p_end_date
        LEFT JOIN discount_scans ds ON ds.discount_id = d.id 
          AND ds.scanned_at BETWEEN p_start_date AND p_end_date
        LEFT JOIN redemptions r ON r.discount_id = d.id 
          AND r.redeemed_at BETWEEN p_start_date AND p_end_date
        WHERE d.business_id = p_business_id
        GROUP BY d.id, d.title
      ) discount_data
    ), '[]'::json),
    'followerTrend', COALESCE((
      SELECT json_agg(
        json_build_object(
          'date', date::TEXT,
          'followers', followers
        ) ORDER BY date
      )
      FROM (
        SELECT 
          date_trunc('day', d)::DATE as date,
          (
            SELECT COUNT(*)
            FROM business_followers bf
            WHERE bf.business_id = p_business_id
              AND bf.created_at <= d
              AND (bf.unfollowed_at IS NULL OR bf.unfollowed_at > d)
          ) as followers
        FROM generate_series(p_start_date::DATE, p_end_date::DATE, '1 day'::INTERVAL) d
      ) trend_data
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;