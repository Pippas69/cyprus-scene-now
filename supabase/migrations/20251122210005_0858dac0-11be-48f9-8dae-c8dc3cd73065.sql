-- Extend get_business_analytics function with advanced analytics data
CREATE OR REPLACE FUNCTION get_business_analytics(
  p_business_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'overview', json_build_object(
      'totalViews', COALESCE((SELECT COUNT(*) FROM event_views ev JOIN events e ON ev.event_id = e.id WHERE e.business_id = p_business_id AND ev.viewed_at BETWEEN p_start_date AND p_end_date), 0),
      'uniqueViewers', COALESCE((SELECT COUNT(DISTINCT user_id) FROM event_views ev JOIN events e ON ev.event_id = e.id WHERE e.business_id = p_business_id AND ev.viewed_at BETWEEN p_start_date AND p_end_date), 0),
      'totalRSVPs', COALESCE((SELECT COUNT(*) FROM rsvps r JOIN events e ON r.event_id = e.id WHERE e.business_id = p_business_id AND r.created_at BETWEEN p_start_date AND p_end_date), 0),
      'totalReservations', COALESCE((SELECT COUNT(*) FROM reservations res JOIN events e ON res.event_id = e.id WHERE e.business_id = p_business_id AND res.created_at BETWEEN p_start_date AND p_end_date), 0),
      'newFollowers', COALESCE((SELECT COUNT(*) FROM business_followers WHERE business_id = p_business_id AND created_at BETWEEN p_start_date AND p_end_date AND (unfollowed_at IS NULL OR unfollowed_at > p_end_date)), 0),
      'totalEngagements', COALESCE((SELECT COUNT(*) FROM engagement_events WHERE business_id = p_business_id AND created_at BETWEEN p_start_date AND p_end_date), 0),
      'engagementRate', COALESCE((SELECT CASE WHEN COUNT(DISTINCT ev.user_id) > 0 THEN (SELECT COUNT(*) FROM engagement_events WHERE business_id = p_business_id AND created_at BETWEEN p_start_date AND p_end_date)::float / COUNT(DISTINCT ev.user_id) * 100 ELSE 0 END FROM event_views ev JOIN events e ON ev.event_id = e.id WHERE e.business_id = p_business_id AND ev.viewed_at BETWEEN p_start_date AND p_end_date), 0),
      'conversionRate', COALESCE((SELECT CASE WHEN COUNT(*) > 0 THEN (SELECT COUNT(*) FROM rsvps r JOIN events e ON r.event_id = e.id WHERE e.business_id = p_business_id AND r.created_at BETWEEN p_start_date AND p_end_date)::float / COUNT(*) * 100 ELSE 0 END FROM event_views ev JOIN events e ON ev.event_id = e.id WHERE e.business_id = p_business_id AND ev.viewed_at BETWEEN p_start_date AND p_end_date), 0)
    ),
    
    'trafficSources', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          source,
          COUNT(*) as views,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT CASE 
            WHEN EXISTS (
              SELECT 1 FROM rsvps r 
              WHERE r.event_id = ev.event_id 
              AND r.user_id = ev.user_id
            ) THEN ev.user_id 
          END) as conversions
        FROM event_views ev
        WHERE event_id IN (SELECT id FROM events WHERE business_id = p_business_id)
        AND viewed_at BETWEEN p_start_date AND p_end_date
        GROUP BY source
      ) t
    ), '[]'::json),
    
    'deviceAnalytics', COALESCE((
      SELECT json_agg(row_to_json(d))
      FROM (
        SELECT 
          COALESCE(device_type, 'unknown') as device_type,
          COUNT(*) as views,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT CASE 
            WHEN EXISTS (
              SELECT 1 FROM rsvps r 
              WHERE r.event_id = ev.event_id 
              AND r.user_id = ev.user_id
            ) THEN ev.user_id 
          END) as conversions
        FROM event_views ev
        WHERE event_id IN (SELECT id FROM events WHERE business_id = p_business_id)
        AND viewed_at BETWEEN p_start_date AND p_end_date
        GROUP BY device_type
      ) d
    ), '[]'::json),
    
    'conversionFunnel', json_build_object(
      'views', COALESCE((
        SELECT COUNT(*) 
        FROM event_views ev
        JOIN events e ON ev.event_id = e.id
        WHERE e.business_id = p_business_id
        AND ev.viewed_at BETWEEN p_start_date AND p_end_date
      ), 0),
      'engagements', COALESCE((
        SELECT COUNT(*) 
        FROM engagement_events 
        WHERE business_id = p_business_id
        AND created_at BETWEEN p_start_date AND p_end_date
      ), 0),
      'interested', COALESCE((
        SELECT COUNT(*) 
        FROM rsvps r
        JOIN events e ON r.event_id = e.id
        WHERE e.business_id = p_business_id
        AND r.status = 'interested'
        AND r.created_at BETWEEN p_start_date AND p_end_date
      ), 0),
      'committed', COALESCE((
        SELECT COUNT(*) 
        FROM rsvps r
        JOIN events e ON r.event_id = e.id
        WHERE e.business_id = p_business_id
        AND r.status = 'going'
        AND r.created_at BETWEEN p_start_date AND p_end_date
      ), 0) + COALESCE((
        SELECT COUNT(*) 
        FROM reservations res
        JOIN events e ON res.event_id = e.id
        WHERE e.business_id = p_business_id
        AND res.created_at BETWEEN p_start_date AND p_end_date
      ), 0)
    ),
    
    'engagementAnalysis', json_build_object(
      'byType', COALESCE((
        SELECT json_object_agg(event_type, count)
        FROM (
          SELECT event_type, COUNT(*) as count
          FROM engagement_events
          WHERE business_id = p_business_id
          AND created_at BETWEEN p_start_date AND p_end_date
          GROUP BY event_type
        ) e
      ), '{}'::json),
      'avgActionsPerUser', COALESCE((
        SELECT CASE WHEN COUNT(DISTINCT user_id) > 0 THEN COUNT(*)::float / COUNT(DISTINCT user_id) ELSE 0 END
        FROM engagement_events
        WHERE business_id = p_business_id
        AND created_at BETWEEN p_start_date AND p_end_date
      ), 0),
      'totalUniqueUsers', COALESCE((
        SELECT COUNT(DISTINCT user_id)
        FROM engagement_events
        WHERE business_id = p_business_id
        AND created_at BETWEEN p_start_date AND p_end_date
      ), 0)
    ),
    
    'rsvpAnalytics', json_build_object(
      'statusBreakdown', COALESCE((
        SELECT json_object_agg(status, count)
        FROM (
          SELECT r.status::text, COUNT(*) as count
          FROM rsvps r
          JOIN events e ON r.event_id = e.id
          WHERE e.business_id = p_business_id
          AND r.created_at BETWEEN p_start_date AND p_end_date
          GROUP BY r.status
        ) s
      ), '{}'::json),
      'reservationStats', COALESCE((
        SELECT json_build_object(
          'total', COUNT(*),
          'avgPartySize', COALESCE(AVG(party_size), 0),
          'byStatus', (
            SELECT json_object_agg(status, cnt)
            FROM (
              SELECT status, COUNT(*) as cnt
              FROM reservations res
              JOIN events e ON res.event_id = e.id
              WHERE e.business_id = p_business_id
              AND res.created_at BETWEEN p_start_date AND p_end_date
              GROUP BY status
            ) st
          )
        )
        FROM reservations res
        JOIN events e ON res.event_id = e.id
        WHERE e.business_id = p_business_id
        AND res.created_at BETWEEN p_start_date AND p_end_date
      ), json_build_object('total', 0, 'avgPartySize', 0, 'byStatus', '{}'::json)),
      'bookingTimeline', COALESCE((
        SELECT json_agg(json_build_object(
          'daysBeforeEvent', days_before,
          'count', cnt
        ))
        FROM (
          SELECT 
            EXTRACT(DAY FROM (e.start_at - res.created_at))::integer as days_before,
            COUNT(*) as cnt
          FROM reservations res
          JOIN events e ON res.event_id = e.id
          WHERE e.business_id = p_business_id
          AND res.created_at BETWEEN p_start_date AND p_end_date
          AND e.start_at > res.created_at
          GROUP BY EXTRACT(DAY FROM (e.start_at - res.created_at))
          ORDER BY days_before
        ) b
      ), '[]'::json)
    ),
    
    'followerGrowthDetailed', json_build_object(
      'timeline', COALESCE((
        SELECT json_agg(row_to_json(f))
        FROM (
          SELECT 
            date_trunc('day', created_at)::date as date,
            COUNT(*) FILTER (WHERE unfollowed_at IS NULL OR unfollowed_at > date_trunc('day', created_at)) as new_followers,
            COUNT(*) FILTER (WHERE unfollowed_at IS NOT NULL AND date_trunc('day', unfollowed_at) = date_trunc('day', created_at)) as unfollows
          FROM business_followers
          WHERE business_id = p_business_id
          AND created_at BETWEEN p_start_date AND p_end_date
          GROUP BY date_trunc('day', created_at)
          ORDER BY date_trunc('day', created_at)
        ) f
      ), '[]'::json),
      'churnRate', COALESCE((
        SELECT CASE WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE unfollowed_at IS NOT NULL)::float / COUNT(*) * 100 ELSE 0 END
        FROM business_followers
        WHERE business_id = p_business_id
        AND created_at <= p_end_date
      ), 0),
      'bySource', COALESCE((
        SELECT json_object_agg(COALESCE(source, 'direct'), count)
        FROM (
          SELECT source, COUNT(*) as count
          FROM business_followers
          WHERE business_id = p_business_id
          AND created_at BETWEEN p_start_date AND p_end_date
          AND (unfollowed_at IS NULL OR unfollowed_at > p_end_date)
          GROUP BY source
        ) s
      ), '{}'::json),
      'netGrowth', COALESCE((
        SELECT COUNT(*) FILTER (WHERE unfollowed_at IS NULL OR unfollowed_at > p_end_date) - COUNT(*) FILTER (WHERE unfollowed_at IS NOT NULL AND unfollowed_at BETWEEN p_start_date AND p_end_date)
        FROM business_followers
        WHERE business_id = p_business_id
        AND created_at BETWEEN p_start_date AND p_end_date
      ), 0)
    ),
    
    'eventPerformance', COALESCE((
      SELECT json_agg(row_to_json(ep))
      FROM (
        SELECT 
          e.id,
          e.title,
          e.start_at,
          COALESCE(v.views, 0) as views,
          COALESCE(v.unique_viewers, 0) as unique_viewers,
          COALESCE(r.rsvp_count, 0) as rsvps,
          COALESCE(res.reservation_count, 0) as reservations,
          COALESCE(eng.engagement_count, 0) as engagements,
          COALESCE(v.top_source, 'unknown') as top_source,
          COALESCE(v.mobile_percent, 0) as mobile_percent
        FROM events e
        LEFT JOIN (
          SELECT 
            event_id,
            COUNT(*) as views,
            COUNT(DISTINCT user_id) as unique_viewers,
            MODE() WITHIN GROUP (ORDER BY source) as top_source,
            (COUNT(*) FILTER (WHERE device_type = 'mobile')::float / NULLIF(COUNT(*), 0) * 100) as mobile_percent
          FROM event_views
          WHERE viewed_at BETWEEN p_start_date AND p_end_date
          GROUP BY event_id
        ) v ON e.id = v.event_id
        LEFT JOIN (
          SELECT event_id, COUNT(*) as rsvp_count
          FROM rsvps
          WHERE created_at BETWEEN p_start_date AND p_end_date
          GROUP BY event_id
        ) r ON e.id = r.event_id
        LEFT JOIN (
          SELECT event_id, COUNT(*) as reservation_count
          FROM reservations
          WHERE created_at BETWEEN p_start_date AND p_end_date
          GROUP BY event_id
        ) res ON e.id = res.event_id
        LEFT JOIN (
          SELECT entity_id::uuid as event_id, COUNT(*) as engagement_count
          FROM engagement_events
          WHERE entity_type = 'event'
          AND created_at BETWEEN p_start_date AND p_end_date
          GROUP BY entity_id
        ) eng ON e.id = eng.event_id
        WHERE e.business_id = p_business_id
        ORDER BY v.views DESC NULLS LAST
      ) ep
    ), '[]'::json),
    
    'discountPerformance', COALESCE((
      SELECT json_agg(row_to_json(dp))
      FROM (
        SELECT 
          d.id,
          d.title,
          d.percent_off,
          d.start_at,
          d.end_at,
          COALESCE(dv.views, 0) as views,
          COALESCE(ds.scans, 0) as scans,
          COALESCE(red.redemptions, 0) as redemptions
        FROM discounts d
        LEFT JOIN (
          SELECT discount_id, COUNT(*) as views
          FROM discount_views
          WHERE viewed_at BETWEEN p_start_date AND p_end_date
          GROUP BY discount_id
        ) dv ON d.id = dv.discount_id
        LEFT JOIN (
          SELECT discount_id, COUNT(*) as scans
          FROM discount_scans
          WHERE scanned_at BETWEEN p_start_date AND p_end_date
          GROUP BY discount_id
        ) ds ON d.id = ds.discount_id
        LEFT JOIN (
          SELECT discount_id, COUNT(*) as redemptions
          FROM redemptions
          WHERE redeemed_at BETWEEN p_start_date AND p_end_date
          GROUP BY discount_id
        ) red ON d.id = red.discount_id
        WHERE d.business_id = p_business_id
      ) dp
    ), '[]'::json),
    
    'audienceInsights', json_build_object(
      'totalViewers', COALESCE((
        SELECT COUNT(DISTINCT ev.user_id)
        FROM event_views ev
        JOIN events e ON ev.event_id = e.id
        WHERE e.business_id = p_business_id
        AND ev.viewed_at BETWEEN p_start_date AND p_end_date
      ), 0),
      'loggedInViewers', COALESCE((
        SELECT COUNT(DISTINCT ev.user_id)
        FROM event_views ev
        JOIN events e ON ev.event_id = e.id
        WHERE e.business_id = p_business_id
        AND ev.user_id IS NOT NULL
        AND ev.viewed_at BETWEEN p_start_date AND p_end_date
      ), 0),
      'ageDistribution', COALESCE((
        SELECT json_agg(json_build_object('age', age, 'count', count))
        FROM (
          SELECT 
            CASE 
              WHEN p.age BETWEEN 15 AND 17 THEN '15-17'
              WHEN p.age BETWEEN 18 AND 24 THEN '18-24'
              WHEN p.age BETWEEN 25 AND 34 THEN '25-34'
              WHEN p.age BETWEEN 35 AND 44 THEN '35-44'
              WHEN p.age BETWEEN 45 AND 60 THEN '45-60'
              ELSE 'other'
            END as age,
            COUNT(*) as count
          FROM event_views ev
          JOIN events e ON ev.event_id = e.id
          JOIN profiles p ON ev.user_id = p.id
          WHERE e.business_id = p_business_id
          AND ev.user_id IS NOT NULL
          AND p.age IS NOT NULL
          AND ev.viewed_at BETWEEN p_start_date AND p_end_date
          GROUP BY age
        ) a
      ), '[]'::json),
      'genderDistribution', COALESCE((
        SELECT json_agg(json_build_object('gender', gender, 'count', count))
        FROM (
          SELECT p.gender, COUNT(*) as count
          FROM event_views ev
          JOIN events e ON ev.event_id = e.id
          JOIN profiles p ON ev.user_id = p.id
          WHERE e.business_id = p_business_id
          AND ev.user_id IS NOT NULL
          AND p.gender IS NOT NULL
          AND ev.viewed_at BETWEEN p_start_date AND p_end_date
          GROUP BY p.gender
        ) g
      ), '[]'::json),
      'cityDistribution', COALESCE((
        SELECT json_agg(json_build_object('city', city, 'count', count))
        FROM (
          SELECT p.city, COUNT(*) as count
          FROM event_views ev
          JOIN events e ON ev.event_id = e.id
          JOIN profiles p ON ev.user_id = p.id
          WHERE e.business_id = p_business_id
          AND ev.user_id IS NOT NULL
          AND p.city IS NOT NULL
          AND ev.viewed_at BETWEEN p_start_date AND p_end_date
          GROUP BY p.city
          ORDER BY count DESC
          LIMIT 10
        ) c
      ), '[]'::json)
    ),
    
    'timeAnalytics', json_build_object(
      'hourlyEngagement', COALESCE((
        SELECT json_agg(json_build_object('hour', hour, 'count', count))
        FROM (
          SELECT EXTRACT(HOUR FROM created_at)::integer as hour, COUNT(*) as count
          FROM engagement_events
          WHERE business_id = p_business_id
          AND created_at BETWEEN p_start_date AND p_end_date
          GROUP BY hour
          ORDER BY hour
        ) h
      ), '[]'::json),
      'dailyEngagement', COALESCE((
        SELECT json_agg(json_build_object('day', day, 'count', count))
        FROM (
          SELECT 
            CASE EXTRACT(DOW FROM created_at)
              WHEN 0 THEN 'Sunday'
              WHEN 1 THEN 'Monday'
              WHEN 2 THEN 'Tuesday'
              WHEN 3 THEN 'Wednesday'
              WHEN 4 THEN 'Thursday'
              WHEN 5 THEN 'Friday'
              WHEN 6 THEN 'Saturday'
            END as day,
            COUNT(*) as count
          FROM engagement_events
          WHERE business_id = p_business_id
          AND created_at BETWEEN p_start_date AND p_end_date
          GROUP BY EXTRACT(DOW FROM created_at)
          ORDER BY EXTRACT(DOW FROM created_at)
        ) d
      ), '[]'::json)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;