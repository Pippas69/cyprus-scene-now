CREATE OR REPLACE FUNCTION public.get_business_analytics(p_business_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: you do not own this business';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.get_crm_guest_stats_v2(p_business_id uuid)
 RETURNS TABLE(guest_id uuid, total_visits bigint, total_spend_cents bigint, total_no_shows bigint, total_cancellations bigint, first_visit timestamp with time zone, last_visit timestamp with time zone, avg_party_size numeric, favorite_table text, total_reservations bigint, guest_age integer, guest_city text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: you do not own this business';
  END IF;

  RETURN QUERY
WITH business_events AS (
  SELECT e.id, e.end_at FROM public.events e WHERE e.business_id = p_business_id
),
standalone_ticket_rows AS (
  SELECT t.id AS ticket_id, t.event_id, t.checked_in_at,
    COALESCE(t.status::text, '') AS status_text,
    CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END AS buyer_id,
    t.user_id AS original_user_id, t.manual_status,
    NULLIF(trim(COALESCE(t.guest_name, '')), '') AS guest_name_exact, t.created_at,
    COALESCE(tord.subtotal_cents / GREATEST((SELECT COUNT(*) FROM public.tickets t2 WHERE t2.order_id = t.order_id AND COALESCE(t2.status::text, '') <> 'cancelled'), 1), COALESCE(tt.price_cents, 0))::bigint AS price_cents
  FROM public.tickets t
  JOIN business_events be ON be.id = t.event_id
  LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
  LEFT JOIN public.ticket_orders tord ON tord.id = t.order_id AND tord.status = 'completed'
  WHERE COALESCE(t.status::text, '') <> 'cancelled'
),
ticket_exact_index AS (
  SELECT str.ticket_id, str.buyer_id, str.guest_name_exact,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(str.buyer_id, str.original_user_id), str.guest_name_exact ORDER BY str.created_at) AS seq_no
  FROM standalone_ticket_rows str
),
ghost_exact_index AS (
  SELECT cg.id AS g_id, COALESCE(cg.user_id, cg.brought_by_user_id) AS buyer_id, NULLIF(trim(COALESCE(cg.guest_name, '')), '') AS guest_name_exact,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(cg.user_id, cg.brought_by_user_id), NULLIF(trim(COALESCE(cg.guest_name, '')), '') ORDER BY cg.created_at) AS seq_no
  FROM public.crm_guests cg WHERE cg.business_id = p_business_id
),
ticket_mapped AS (
  SELECT COALESCE(gei.g_id,
    (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = COALESCE(str.buyer_id, str.original_user_id) ORDER BY cg.created_at LIMIT 1),
    (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = str.guest_name_exact ORDER BY cg.created_at LIMIT 1)
  ) AS g_id, str.*
  FROM standalone_ticket_rows str
  LEFT JOIN ticket_exact_index tei ON tei.ticket_id = str.ticket_id
  LEFT JOIN ghost_exact_index gei ON gei.buyer_id IS NOT DISTINCT FROM COALESCE(str.buyer_id, str.original_user_id) AND gei.guest_name_exact = str.guest_name_exact AND gei.seq_no = tei.seq_no
),
ticket_visits AS (
  SELECT tm.g_id, MIN(tm.checked_in_at) AS visited_at, tm.event_id
  FROM ticket_mapped tm WHERE tm.g_id IS NOT NULL AND tm.checked_in_at IS NOT NULL AND COALESCE(tm.manual_status, '') <> 'no_show'
  GROUP BY tm.g_id, tm.event_id
),
reservation_visits AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    r.checked_in_at AS visited_at, r.event_id
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.checked_in_at IS NOT NULL AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
all_visits AS (
  SELECT g_id, visited_at, event_id FROM ticket_visits
  UNION ALL
  SELECT g_id, visited_at, event_id FROM reservation_visits WHERE g_id IS NOT NULL
),
visit_stats AS (
  SELECT v.g_id, COUNT(*)::bigint AS total_visits, MIN(v.visited_at) AS first_visit, MAX(v.visited_at) AS last_visit
  FROM all_visits v GROUP BY v.g_id
),
ticket_spend AS (
  SELECT tm.g_id, SUM(tm.price_cents)::bigint AS spend_cents
  FROM ticket_mapped tm WHERE tm.g_id IS NOT NULL GROUP BY tm.g_id
),
hybrid_spend_distributed AS (
  SELECT tm.g_id,
    (CASE
      WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0 THEN r.actual_spend_cents
      WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0 THEN r.prepaid_min_charge_cents
      ELSE NULL
    END / GREATEST(r.party_size, 1))::bigint AS spend_per_person_cents
  FROM public.reservations r
  JOIN business_events be ON be.id = r.event_id
  JOIN ticket_mapped tm ON tm.event_id = r.event_id
    AND COALESCE(tm.buyer_id, tm.original_user_id) = r.user_id
  WHERE r.auto_created_from_tickets = true
    AND r.status IN ('accepted', 'completed', 'no_show')
    AND tm.g_id IS NOT NULL
    AND (r.prepaid_min_charge_cents IS NOT NULL OR r.actual_spend_cents IS NOT NULL)
),
hybrid_spend AS (
  SELECT g_id, SUM(spend_per_person_cents)::bigint AS spend_cents
  FROM hybrid_spend_distributed
  WHERE spend_per_person_cents IS NOT NULL
  GROUP BY g_id
),
reservation_spend_raw AS (
  SELECT
    r.user_id AS booker_user_id,
    r.is_manual_entry,
    r.reservation_name,
    CASE
      WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0 THEN r.actual_spend_cents
      WHEN r.checked_in_at IS NOT NULL THEN COALESCE(r.prepaid_min_charge_cents, 0)
      ELSE COALESCE(r.prepaid_min_charge_cents, 0)
    END AS total_spend_cents,
    r.party_size
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed', 'no_show')
    AND COALESCE(r.auto_created_from_tickets, false) = false
    AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
reservation_spend_manual AS (
  SELECT
    (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id 
      AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(rsr.reservation_name, '')), '') 
      ORDER BY cg.created_at LIMIT 1
    ) AS g_id,
    rsr.total_spend_cents AS spend_cents
  FROM reservation_spend_raw rsr
  WHERE rsr.is_manual_entry = true
),
reservation_spend_per_person AS (
  SELECT
    rsr.booker_user_id,
    (rsr.total_spend_cents / GREATEST(rsr.party_size, 1))::bigint AS spend_per_person
  FROM reservation_spend_raw rsr
  WHERE COALESCE(rsr.is_manual_entry, false) = false
    AND rsr.booker_user_id IS NOT NULL
),
reservation_spend_distributed AS (
  SELECT cg.id AS g_id, rspp.spend_per_person AS spend_cents
  FROM reservation_spend_per_person rspp
  JOIN public.crm_guests cg ON cg.business_id = p_business_id AND cg.user_id = rspp.booker_user_id
  UNION ALL
  SELECT cg.id AS g_id, rspp.spend_per_person AS spend_cents
  FROM reservation_spend_per_person rspp
  JOIN public.crm_guests cg ON cg.business_id = p_business_id 
    AND cg.brought_by_user_id = rspp.booker_user_id 
    AND cg.user_id IS NULL
  UNION ALL
  SELECT g_id, spend_cents FROM reservation_spend_manual WHERE g_id IS NOT NULL
),
reservation_spend AS (
  SELECT g_id, SUM(spend_cents)::bigint AS spend_cents 
  FROM reservation_spend_distributed 
  WHERE g_id IS NOT NULL 
  GROUP BY g_id
),
ticket_no_shows AS (
  SELECT tm.g_id, COUNT(DISTINCT tm.event_id)::bigint AS no_shows
  FROM ticket_mapped tm JOIN business_events be ON be.id = tm.event_id
  WHERE tm.g_id IS NOT NULL AND tm.checked_in_at IS NULL
    AND ((be.end_at + interval '10 hours') < now() OR tm.manual_status = 'no_show')
  GROUP BY tm.g_id
),
reservation_no_shows AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    r.id
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status = 'no_show' AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
reservation_no_show_stats AS (
  SELECT g_id, COUNT(*)::bigint AS no_shows FROM reservation_no_shows WHERE g_id IS NOT NULL GROUP BY g_id
),
reservation_cancellations AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    r.id
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status = 'cancelled' AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
reservation_cancellation_stats AS (
  SELECT g_id, COUNT(*)::bigint AS total_cancellations FROM reservation_cancellations WHERE g_id IS NOT NULL GROUP BY g_id
),
party_size_stats AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    r.party_size
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed') AND r.party_size > 0 AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
party_size_agg AS (
  SELECT g_id, AVG(party_size)::numeric(10,2) AS avg_party_size FROM party_size_stats WHERE g_id IS NOT NULL GROUP BY g_id
),
reservation_count_stats AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    r.id
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
reservation_count_agg AS (
  SELECT g_id, COUNT(*)::bigint AS total_reservations FROM reservation_count_stats WHERE g_id IS NOT NULL GROUP BY g_id
),
ticket_demographics AS (
  SELECT DISTINCT ON (tm.g_id) tm.g_id, p.age AS guest_age, p.city AS guest_city
  FROM ticket_mapped tm JOIN public.tickets t ON t.id = tm.ticket_id LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE tm.g_id IS NOT NULL AND t.user_id IS NOT NULL AND (p.age IS NOT NULL OR p.city IS NOT NULL)
  ORDER BY tm.g_id, t.created_at DESC
),
ticket_demographics_fallback AS (
  SELECT DISTINCT ON (tm.g_id) tm.g_id, t.guest_age AS guest_age, t.guest_city AS guest_city
  FROM ticket_mapped tm JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.g_id IS NOT NULL AND (t.guest_age IS NOT NULL OR t.guest_city IS NOT NULL)
  ORDER BY tm.g_id, t.created_at DESC
),
reservation_demographics AS (
  SELECT DISTINCT ON (cg.id) cg.id AS g_id, p.age AS guest_age, p.city AS guest_city
  FROM public.crm_guests cg LEFT JOIN public.profiles p ON p.id = cg.user_id
  WHERE cg.business_id = p_business_id AND cg.user_id IS NOT NULL AND (p.age IS NOT NULL OR p.city IS NOT NULL)
  ORDER BY cg.id, cg.updated_at DESC NULLS LAST
),
profile_demographics AS (
  SELECT cg.id AS g_id, p.age AS profile_age, p.city AS profile_city
  FROM public.crm_guests cg LEFT JOIN public.profiles p ON p.id = cg.user_id
  WHERE cg.business_id = p_business_id
),
favorite_table_stats AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    NULLIF(trim(COALESCE(r.table_label, '')), '') AS label
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed') AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
favorite_table_ranked AS (
  SELECT g_id, label, COUNT(*) AS uses, ROW_NUMBER() OVER (PARTITION BY g_id ORDER BY COUNT(*) DESC) AS rn
  FROM favorite_table_stats WHERE g_id IS NOT NULL GROUP BY g_id, label
)
SELECT
  cg.id AS guest_id,
  COALESCE(vs.total_visits, 0)::bigint AS total_visits,
  GREATEST(COALESCE(cg.spend_override_cents,
    CASE
      WHEN hs.spend_cents IS NOT NULL THEN hs.spend_cents
      ELSE COALESCE(ts.spend_cents, 0) + COALESCE(rs.spend_cents, 0)
    END
  ), 0)::bigint AS total_spend_cents,
  (COALESCE(tns.no_shows, 0) + COALESCE(rns.no_shows, 0))::bigint AS total_no_shows,
  COALESCE(rc.total_cancellations, 0)::bigint AS total_cancellations,
  vs.first_visit, vs.last_visit,
  COALESCE(ps.avg_party_size, 0) AS avg_party_size,
  COALESCE(cg.favorite_table_override, ftr.label) AS favorite_table,
  COALESCE(rcount.total_reservations, 0)::bigint AS total_reservations,
  COALESCE(td.guest_age, tdf.guest_age, rd.guest_age, pd.profile_age)::integer AS guest_age,
  COALESCE(td.guest_city, tdf.guest_city, rd.guest_city, pd.profile_city) AS guest_city
FROM public.crm_guests cg
LEFT JOIN visit_stats vs ON vs.g_id = cg.id
LEFT JOIN ticket_spend ts ON ts.g_id = cg.id
LEFT JOIN hybrid_spend hs ON hs.g_id = cg.id
LEFT JOIN reservation_spend rs ON rs.g_id = cg.id
LEFT JOIN ticket_no_shows tns ON tns.g_id = cg.id
LEFT JOIN reservation_no_show_stats rns ON rns.g_id = cg.id
LEFT JOIN reservation_cancellation_stats rc ON rc.g_id = cg.id
LEFT JOIN party_size_agg ps ON ps.g_id = cg.id
LEFT JOIN reservation_count_agg rcount ON rcount.g_id = cg.id
LEFT JOIN ticket_demographics td ON td.g_id = cg.id
LEFT JOIN ticket_demographics_fallback tdf ON tdf.g_id = cg.id AND td.g_id IS NULL
LEFT JOIN reservation_demographics rd ON rd.g_id = cg.id
LEFT JOIN profile_demographics pd ON pd.g_id = cg.id
LEFT JOIN favorite_table_ranked ftr ON ftr.g_id = cg.id AND ftr.rn = 1
WHERE cg.business_id = p_business_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_crm_guest_timeline(p_business_id uuid, p_guest_id uuid)
 RETURNS TABLE(activity_type text, title text, activity_date timestamp with time zone, booked_at timestamp with time zone, checked_in_at timestamp with time zone, spend_cents bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: you do not own this business';
  END IF;

  RETURN QUERY
  WITH guest_info AS (
    SELECT cg.user_id, cg.guest_name, cg.brought_by_user_id, cg.profile_type
    FROM crm_guests cg
    WHERE cg.id = p_guest_id AND cg.business_id = p_business_id
    LIMIT 1
  ),
  hybrid_reservation_ids AS (
    SELECT DISTINCT tord.linked_reservation_id AS id
    FROM ticket_orders tord
    WHERE tord.linked_reservation_id IS NOT NULL
  ),
  ticket_activities AS (
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM reservations r2 WHERE r2.id = tord.linked_reservation_id)
        THEN 'hybrid'::text
        ELSE 'ticket'::text
      END AS activity_type,
      e.title,
      COALESCE(e.start_at, e.created_at) AS activity_date,
      COALESCE(tord.created_at, t.created_at) AS booked_at,
      t.checked_in_at,
      COALESCE(
        tord.subtotal_cents / GREATEST(
          (SELECT COUNT(*) FROM tickets t2 WHERE t2.order_id = t.order_id AND COALESCE(t2.status::text,'') <> 'cancelled'), 1
        ),
        COALESCE(tt.price_cents, 0)
      )::bigint AS spend_cents
    FROM tickets t
    JOIN events e ON e.id = t.event_id AND e.business_id = p_business_id
    LEFT JOIN ticket_orders tord ON tord.id = t.order_id AND tord.status = 'completed'
    LEFT JOIN ticket_tiers tt ON tt.id = t.tier_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(t.status::text, '') <> 'cancelled'
      AND (
        (gi.user_id IS NOT NULL AND t.user_id = gi.user_id AND COALESCE(t.is_manual_entry, false) = false
         AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (gi.brought_by_user_id IS NOT NULL AND t.user_id = gi.brought_by_user_id
            AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (gi.user_id IS NULL AND gi.brought_by_user_id IS NULL
            AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (COALESCE(t.is_manual_entry, false) = true
            AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
      )
  ),
  reservation_booker AS (
    SELECT
      CASE
        WHEN r.source = 'walk_in' AND r.event_id IS NOT NULL THEN 'walk_in_event'::text
        WHEN r.source = 'walk_in' THEN 'walk_in'::text
        WHEN r.event_id IS NOT NULL THEN 'reservation_event'::text
        WHEN op.id IS NOT NULL THEN 'offer'::text
        ELSE 'reservation_profile'::text
      END AS activity_type,
      COALESCE(e.title, d.title, b.name, 'Κράτηση') AS title,
      COALESCE(e.start_at, r.preferred_time, r.created_at) AS activity_date,
      r.created_at AS booked_at,
      r.checked_in_at,
      CASE
        WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0
          THEN (r.actual_spend_cents / GREATEST(r.party_size, 1))::bigint
        WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0
          THEN (r.prepaid_min_charge_cents / GREATEST(r.party_size, 1))::bigint
        ELSE 0::bigint
      END AS spend_cents
    FROM reservations r
    LEFT JOIN events e ON e.id = r.event_id
    LEFT JOIN businesses b ON b.id = r.business_id
    LEFT JOIN offer_purchases op ON op.reservation_id = r.id
    LEFT JOIN discounts d ON d.id = op.discount_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(r.auto_created_from_tickets, false) = false
      AND r.id NOT IN (SELECT hri.id FROM hybrid_reservation_ids hri)
      AND r.source IS DISTINCT FROM 'ticket_auto'
      AND r.status IN ('accepted', 'completed', 'pending', 'no_show')
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND (
        (gi.user_id IS NOT NULL AND r.user_id = gi.user_id)
        OR (r.is_manual_entry = true AND lower(trim(COALESCE(r.reservation_name,''))) = lower(trim(COALESCE(gi.guest_name,'')))) 
        OR (gi.user_id IS NULL AND gi.brought_by_user_id IS NULL
            AND lower(trim(COALESCE(r.reservation_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
      )
  ),
  reservation_ghost_event AS (
    SELECT
      CASE
        WHEN r.source = 'walk_in' THEN 'walk_in_event'::text
        ELSE 'reservation_event'::text
      END AS activity_type,
      COALESCE(e.title, 'Κράτηση') AS title,
      COALESCE(e.start_at, r.preferred_time, r.created_at) AS activity_date,
      r.created_at AS booked_at,
      COALESCE(rg.checked_in_at, r.checked_in_at) AS checked_in_at,
      CASE
        WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0
          THEN (r.actual_spend_cents / GREATEST(r.party_size, 1))::bigint
        WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0
          THEN (r.prepaid_min_charge_cents / GREATEST(r.party_size, 1))::bigint
        ELSE 0::bigint
      END AS spend_cents
    FROM reservation_guests rg
    JOIN reservations r ON r.id = rg.reservation_id
    LEFT JOIN events e ON e.id = r.event_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(r.auto_created_from_tickets, false) = false
      AND r.id NOT IN (SELECT hri.id FROM hybrid_reservation_ids hri)
      AND r.source IS DISTINCT FROM 'ticket_auto'
      AND r.status IN ('accepted', 'completed', 'pending', 'no_show')
      AND r.event_id IS NOT NULL
      AND e.business_id = p_business_id
      AND gi.brought_by_user_id IS NOT NULL
      AND r.user_id = gi.brought_by_user_id
      AND lower(trim(COALESCE(rg.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,'')))
  ),
  reservation_ghost_profile AS (
    SELECT
      CASE
        WHEN r.source = 'walk_in' THEN 'walk_in'::text
        WHEN op.id IS NOT NULL THEN 'offer'::text
        ELSE 'reservation_profile'::text
      END AS activity_type,
      COALESCE(d.title, b.name, 'Κράτηση') AS title,
      COALESCE(r.preferred_time, r.created_at) AS activity_date,
      r.created_at AS booked_at,
      r.checked_in_at,
      CASE
        WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0
          THEN (r.actual_spend_cents / GREATEST(r.party_size, 1))::bigint
        WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0
          THEN (r.prepaid_min_charge_cents / GREATEST(r.party_size, 1))::bigint
        ELSE 0::bigint
      END AS spend_cents
    FROM reservations r
    LEFT JOIN businesses b ON b.id = r.business_id
    LEFT JOIN offer_purchases op ON op.reservation_id = r.id
    LEFT JOIN discounts d ON d.id = op.discount_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(r.auto_created_from_tickets, false) = false
      AND r.event_id IS NULL
      AND r.business_id = p_business_id
      AND gi.brought_by_user_id IS NOT NULL
      AND r.user_id = gi.brought_by_user_id
  )
  SELECT * FROM ticket_activities
  UNION ALL
  SELECT * FROM reservation_booker
  UNION ALL
  SELECT * FROM reservation_ghost_event
  UNION ALL
  SELECT * FROM reservation_ghost_profile
  ORDER BY activity_date DESC;
END;
$function$;