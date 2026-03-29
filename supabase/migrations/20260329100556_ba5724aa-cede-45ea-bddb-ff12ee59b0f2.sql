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
  total_reservations bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH business_events AS (
  SELECT e.id, e.end_at
  FROM public.events e
  WHERE e.business_id = p_business_id
),

standalone_ticket_rows AS (
  SELECT
    t.id AS ticket_id,
    t.event_id,
    t.checked_in_at,
    COALESCE(t.status::text, '') AS status_text,
    CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END AS buyer_id,
    NULLIF(trim(COALESCE(t.guest_name, '')), '') AS guest_name_exact,
    t.created_at,
    COALESCE(tt.price_cents, 0)::bigint AS price_cents
  FROM public.tickets t
  JOIN business_events be ON be.id = t.event_id
  LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
  WHERE COALESCE(t.status::text, '') <> 'cancelled'
),

ticket_exact_index AS (
  SELECT
    str.ticket_id,
    row_number() OVER (
      PARTITION BY str.buyer_id, str.guest_name_exact
      ORDER BY str.created_at, str.ticket_id
    ) AS seq_no
  FROM standalone_ticket_rows str
  WHERE str.guest_name_exact IS NOT NULL
),

ghost_exact_index AS (
  SELECT
    cg.id AS guest_id,
    cg.brought_by_user_id AS buyer_id,
    NULLIF(trim(COALESCE(cg.guest_name, '')), '') AS guest_name_exact,
    row_number() OVER (
      PARTITION BY cg.brought_by_user_id, NULLIF(trim(COALESCE(cg.guest_name, '')), '')
      ORDER BY cg.created_at, cg.id
    ) AS seq_no
  FROM public.crm_guests cg
  WHERE cg.business_id = p_business_id
    AND cg.user_id IS NULL
    AND cg.profile_type IN ('ghost', 'merged')
),

ticket_mapped AS (
  SELECT
    str.ticket_id,
    str.event_id,
    str.checked_in_at,
    str.status_text,
    str.price_cents,
    COALESCE(
      gei.guest_id,
      public.resolve_crm_guest_for_ticket(
        p_business_id,
        str.buyer_id,
        str.guest_name_exact
      )
    ) AS g_id
  FROM standalone_ticket_rows str
  LEFT JOIN ticket_exact_index tei ON tei.ticket_id = str.ticket_id
  LEFT JOIN ghost_exact_index gei
    ON gei.buyer_id IS NOT DISTINCT FROM str.buyer_id
   AND gei.guest_name_exact = str.guest_name_exact
   AND gei.seq_no = tei.seq_no
),

ticket_visits AS (
  SELECT
    tm.g_id,
    MIN(tm.checked_in_at) AS visited_at,
    tm.event_id
  FROM ticket_mapped tm
  WHERE tm.g_id IS NOT NULL
    AND tm.checked_in_at IS NOT NULL
  GROUP BY tm.g_id, tm.event_id
),

reservation_visits AS (
  SELECT
    CASE
      WHEN r.is_manual_entry THEN (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '')
        ORDER BY cg.created_at
        LIMIT 1
      )
      WHEN r.user_id IS NOT NULL THEN (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id = r.user_id
        LIMIT 1
      )
      ELSE (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '')
        ORDER BY cg.created_at
        LIMIT 1
      )
    END AS g_id,
    r.checked_in_at AS visited_at,
    r.event_id
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.checked_in_at IS NOT NULL
    AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),

all_visits AS (
  SELECT g_id, visited_at, event_id FROM ticket_visits
  UNION ALL
  SELECT g_id, visited_at, event_id FROM reservation_visits WHERE g_id IS NOT NULL
),

visit_stats AS (
  SELECT
    v.g_id,
    COUNT(*)::bigint AS total_visits,
    MIN(v.visited_at) AS first_visit,
    MAX(v.visited_at) AS last_visit
  FROM (
    SELECT g_id, MIN(visited_at) AS visited_at, event_id
    FROM all_visits
    WHERE event_id IS NOT NULL
    GROUP BY g_id, event_id

    UNION ALL

    SELECT g_id, visited_at, event_id
    FROM all_visits
    WHERE event_id IS NULL
  ) v
  WHERE v.g_id IS NOT NULL
  GROUP BY v.g_id
),

ticket_spend AS (
  SELECT tm.g_id, SUM(tm.price_cents)::bigint AS spend_cents
  FROM ticket_mapped tm
  WHERE tm.g_id IS NOT NULL
    AND tm.status_text IN ('valid', 'used')
  GROUP BY tm.g_id
),

ticket_no_shows AS (
  SELECT tm.g_id, COUNT(DISTINCT tm.event_id)::bigint AS no_shows
  FROM ticket_mapped tm
  JOIN business_events be ON be.id = tm.event_id
  WHERE tm.g_id IS NOT NULL
    AND tm.checked_in_at IS NULL
    AND be.end_at < now()
  GROUP BY tm.g_id
),

reservation_cancellations AS (
  SELECT
    CASE
      WHEN r.user_id IS NOT NULL THEN (
        SELECT cg.id FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id = r.user_id
        LIMIT 1
      )
      ELSE (
        SELECT cg.id FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '')
        ORDER BY cg.created_at
        LIMIT 1
      )
    END AS g_id,
    COUNT(*)::bigint AS total_cancellations
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status = 'cancelled'
    AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  GROUP BY 1
),

reservation_party AS (
  SELECT
    CASE
      WHEN r.user_id IS NOT NULL THEN (
        SELECT cg.id FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id = r.user_id
        LIMIT 1
      )
      ELSE (
        SELECT cg.id FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND NULLIF(trim(COALESCE(cg.guest_name, '')), '') = NULLIF(trim(COALESCE(r.reservation_name, '')), '')
        ORDER BY cg.created_at
        LIMIT 1
      )
    END AS g_id,
    COALESCE(r.party_size, 1) AS party_size
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.status IN ('accepted', 'completed', 'no_show')
    AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
),

party_stats AS (
  SELECT g_id, ROUND(AVG(party_size), 1) AS avg_party_size
  FROM reservation_party
  WHERE g_id IS NOT NULL
  GROUP BY g_id
),

reservation_count AS (
  SELECT g_id, COUNT(*)::bigint AS total_reservations
  FROM reservation_party
  WHERE g_id IS NOT NULL
  GROUP BY g_id
)

SELECT
  cg.id AS guest_id,
  COALESCE(vs.total_visits, 0)::bigint AS total_visits,
  CASE
    WHEN cg.spend_override_cents IS NOT NULL THEN cg.spend_override_cents
    ELSE COALESCE(ts.spend_cents, 0)
  END::bigint AS total_spend_cents,
  COALESCE(tns.no_shows, 0)::bigint AS total_no_shows,
  COALESCE(rca.total_cancellations, 0)::bigint AS total_cancellations,
  vs.first_visit,
  vs.last_visit,
  COALESCE(ps.avg_party_size, 0)::numeric AS avg_party_size,
  cg.favorite_table_override AS favorite_table,
  COALESCE(rct.total_reservations, 0)::bigint AS total_reservations
FROM public.crm_guests cg
LEFT JOIN visit_stats vs ON vs.g_id = cg.id
LEFT JOIN ticket_spend ts ON ts.g_id = cg.id
LEFT JOIN ticket_no_shows tns ON tns.g_id = cg.id
LEFT JOIN reservation_cancellations rca ON rca.g_id = cg.id
LEFT JOIN party_stats ps ON ps.g_id = cg.id
LEFT JOIN reservation_count rct ON rct.g_id = cg.id
WHERE cg.business_id = p_business_id;
$function$;