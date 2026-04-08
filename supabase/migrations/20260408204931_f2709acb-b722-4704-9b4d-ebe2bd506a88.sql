
CREATE OR REPLACE FUNCTION public.get_crm_guest_stats_v2(p_business_id uuid)
RETURNS TABLE(
  guest_id uuid,
  total_visits bigint,
  total_spend_cents bigint,
  total_no_shows bigint,
  total_cancellations bigint,
  first_visit timestamptz,
  last_visit timestamptz,
  avg_party_size numeric,
  favorite_table text,
  total_reservations bigint,
  guest_age integer,
  guest_city text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
  SELECT cg.id AS g_id, cg.user_id AS buyer_id, NULLIF(trim(COALESCE(cg.guest_name, '')), '') AS guest_name_exact,
    ROW_NUMBER() OVER (PARTITION BY cg.user_id, NULLIF(trim(COALESCE(cg.guest_name, '')), '') ORDER BY cg.created_at) AS seq_no
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
    COUNT(*)::bigint AS no_shows
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE (r.status = 'no_show' OR r.manual_status = 'no_show')
    AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  GROUP BY 1
),
reservation_cancellations AS (
  SELECT
    CASE
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    COUNT(*)::bigint AS total_cancellations
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status = 'cancelled' AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  GROUP BY 1
),
reservation_party AS (
  SELECT
    CASE
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    COALESCE(r.party_size, 1) AS party_size
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed', 'no_show') AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
party_stats AS (
  SELECT g_id, ROUND(AVG(party_size), 1) AS avg_party_size FROM reservation_party WHERE g_id IS NOT NULL GROUP BY g_id
),
reservation_count AS (
  SELECT g_id, COUNT(*)::bigint AS total_reservations FROM reservation_party WHERE g_id IS NOT NULL GROUP BY g_id
),
-- Primary: ticket demographics via ticket_mapped
ticket_demographics AS (
  SELECT DISTINCT ON (tm.g_id) tm.g_id, t.guest_age, t.guest_city
  FROM ticket_mapped tm JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.g_id IS NOT NULL AND (t.guest_age IS NOT NULL OR t.guest_city IS NOT NULL)
  ORDER BY tm.g_id, t.created_at DESC
),
-- Fallback: direct name match for ghosts whose ticket_mapped failed
ticket_demographics_fallback AS (
  SELECT DISTINCT ON (cg.id) cg.id AS g_id, t.guest_age, t.guest_city
  FROM public.crm_guests cg
  JOIN public.tickets t ON LOWER(trim(t.guest_name)) = LOWER(trim(cg.guest_name))
  JOIN business_events be ON be.id = t.event_id
  WHERE cg.business_id = p_business_id
    AND cg.id NOT IN (SELECT td.g_id FROM ticket_demographics td WHERE td.g_id IS NOT NULL)
    AND (t.guest_age IS NOT NULL OR t.guest_city IS NOT NULL)
    AND COALESCE(t.status::text, '') <> 'cancelled'
  ORDER BY cg.id, t.created_at DESC
),
-- Reservation demographics
reservation_demographics AS (
  SELECT DISTINCT ON (g_id) g_id,
    CASE WHEN r.guest_ages ~ '^\d+$' THEN r.guest_ages::integer ELSE NULL END AS guest_age,
    NULLIF(trim(COALESCE(r.guest_city, '')), '') AS guest_city
  FROM (
    SELECT
      CASE
        WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
        WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
        ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      END AS g_id,
      r.guest_ages, r.guest_city, r.created_at
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE (r.guest_ages IS NOT NULL OR r.guest_city IS NOT NULL)
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  ) r
  WHERE g_id IS NOT NULL
  ORDER BY g_id, r.created_at DESC
),
-- Profile demographics (registered: own profile, ghost: booker's profile)
profile_demographics AS (
  SELECT cg.id AS g_id,
    p.age AS profile_age,
    NULLIF(trim(COALESCE(p.city, '')), '') AS profile_city
  FROM public.crm_guests cg
  JOIN public.profiles p ON p.id = COALESCE(cg.user_id, cg.brought_by_user_id)
  WHERE cg.business_id = p_business_id
    AND (p.age IS NOT NULL OR NULLIF(trim(COALESCE(p.city, '')), '') IS NOT NULL)
),
reservation_spend_base AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    CASE
      WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0 THEN r.actual_spend_cents
      WHEN r.checked_in_at IS NOT NULL THEN COALESCE(r.prepaid_min_charge_cents, 0)
      ELSE COALESCE(r.prepaid_min_charge_cents, 0)
    END AS spend_cents
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed', 'no_show')
    AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
reservation_spend AS (
  SELECT g_id, SUM(spend_cents)::bigint AS spend_cents FROM reservation_spend_base WHERE g_id IS NOT NULL GROUP BY g_id
),
favorite_table_cte AS (
  SELECT rta.reservation_id, fpt.label
  FROM public.reservation_table_assignments rta
  JOIN public.floor_plan_tables fpt ON fpt.id = rta.table_id
),
favorite_table_stats AS (
  SELECT
    CASE
      WHEN r.user_id IS NOT NULL THEN (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1)
      ELSE (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '') ORDER BY cg.created_at LIMIT 1)
    END AS g_id,
    ftc.label
  FROM public.reservations r
  JOIN favorite_table_cte ftc ON ftc.reservation_id = r.id
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed') AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),
favorite_table_ranked AS (
  SELECT g_id, label, COUNT(*) AS cnt,
    ROW_NUMBER() OVER (PARTITION BY g_id ORDER BY COUNT(*) DESC) AS rn
  FROM favorite_table_stats WHERE g_id IS NOT NULL GROUP BY g_id, label
)
SELECT
  cg.id AS guest_id,
  COALESCE(vs.total_visits, 0)::bigint AS total_visits,
  GREATEST(COALESCE(cg.spend_override_cents, COALESCE(ts.spend_cents, 0) + COALESCE(rs.spend_cents, 0)), 0)::bigint AS total_spend_cents,
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
LEFT JOIN reservation_spend rs ON rs.g_id = cg.id
LEFT JOIN ticket_no_shows tns ON tns.g_id = cg.id
LEFT JOIN reservation_no_shows rns ON rns.g_id = cg.id
LEFT JOIN reservation_cancellations rc ON rc.g_id = cg.id
LEFT JOIN party_stats ps ON ps.g_id = cg.id
LEFT JOIN reservation_count rcount ON rcount.g_id = cg.id
LEFT JOIN favorite_table_ranked ftr ON ftr.g_id = cg.id AND ftr.rn = 1
LEFT JOIN ticket_demographics td ON td.g_id = cg.id
LEFT JOIN ticket_demographics_fallback tdf ON tdf.g_id = cg.id
LEFT JOIN reservation_demographics rd ON rd.g_id = cg.id
LEFT JOIN profile_demographics pd ON pd.g_id = cg.id
WHERE cg.business_id = p_business_id;
$$;
