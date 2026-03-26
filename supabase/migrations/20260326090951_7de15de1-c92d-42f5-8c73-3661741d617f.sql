
-- Fix: ticket_orders uses linked_reservation_id, not reservation_id
CREATE OR REPLACE FUNCTION public.get_crm_guest_stats(p_business_id uuid)
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
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH business_events AS (
    SELECT e.id, e.end_at FROM public.events e WHERE e.business_id = p_business_id
  ),

  ticket_visits AS (
    SELECT
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      t.checked_in_at AS visited_at,
      t.event_id AS visit_event_id
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    WHERE t.checked_in_at IS NOT NULL
      AND COALESCE(t.status::text, '') <> 'cancelled'
  ),

  res_guest_visits AS (
    SELECT
      nm.id AS g_id,
      rg.checked_in_at AS visited_at,
      r.event_id AS visit_event_id
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
      LIMIT 1
    ) nm ON TRUE
    WHERE rg.checked_in_at IS NOT NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),

  reservation_main_participant AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      r.checked_in_at AS visited_at,
      r.event_id AS visit_event_id
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE r.checked_in_at IS NOT NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_orders tord
        WHERE tord.linked_reservation_id = r.id
      )
  ),

  all_visits_raw AS (
    SELECT g_id, visited_at, visit_event_id FROM ticket_visits
    UNION ALL
    SELECT g_id, visited_at, visit_event_id FROM res_guest_visits
    UNION ALL
    SELECT g_id, visited_at, visit_event_id FROM reservation_main_participant
  ),

  all_visits AS (
    SELECT DISTINCT g_id, visit_event_id, MIN(visited_at) AS visited_at
    FROM all_visits_raw
    WHERE g_id IS NOT NULL
    GROUP BY g_id, visit_event_id
  ),

  visit_stats AS (
    SELECT
      g_id,
      COUNT(*)::bigint AS total_visits,
      MIN(visited_at) AS first_visit,
      MAX(visited_at) AS last_visit
    FROM all_visits
    GROUP BY g_id
  ),

  ticket_no_shows AS (
    SELECT
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      t.event_id
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    WHERE t.checked_in_at IS NULL
      AND COALESCE(t.status::text, '') <> 'cancelled'
      AND be.end_at < NOW()
  ),

  res_guest_no_shows AS (
    SELECT
      nm.id AS g_id,
      r.event_id
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
      LIMIT 1
    ) nm ON TRUE
    WHERE rg.checked_in_at IS NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND (r.event_id IS NULL OR EXISTS (SELECT 1 FROM business_events be2 WHERE be2.id = r.event_id AND be2.end_at < NOW()))
  ),

  reservation_main_no_shows AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      r.event_id
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE r.checked_in_at IS NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_orders tord
        WHERE tord.linked_reservation_id = r.id
      )
      AND (r.event_id IS NULL OR EXISTS (SELECT 1 FROM business_events be2 WHERE be2.id = r.event_id AND be2.end_at < NOW()))
  ),

  all_no_shows_raw AS (
    SELECT g_id, event_id FROM ticket_no_shows
    UNION ALL
    SELECT g_id, event_id FROM res_guest_no_shows
    UNION ALL
    SELECT g_id, event_id FROM reservation_main_no_shows
  ),

  no_show_stats AS (
    SELECT g_id, COUNT(DISTINCT event_id)::bigint AS no_shows
    FROM all_no_shows_raw
    WHERE g_id IS NOT NULL
    GROUP BY g_id
  ),

  ticket_spend AS (
    SELECT
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      t.event_id,
      t.order_id,
      t.checked_in_at
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    WHERE COALESCE(t.status::text, '') <> 'cancelled'
  ),

  ticket_spend_per_guest AS (
    SELECT
      ts2.g_id,
      SUM(
        CASE
          WHEN ts2.checked_in_at IS NOT NULL AND be2.end_at < NOW() THEN
            GREATEST(
              COALESCE(tord.total_amount_cents, 0)::numeric / NULLIF(tord.quantity, 0),
              COALESCE(
                (SELECT stt.min_spend_cents
                 FROM public.seating_type_tiers stt
                 WHERE stt.seating_type_id = (SELECT r2.seating_type_id FROM public.reservations r2 WHERE r2.id = tord.linked_reservation_id)
                   AND stt.tier_size = tord.quantity
                 LIMIT 1
                ), 0
              )::numeric / NULLIF(tord.quantity, 0)
            )
          WHEN ts2.checked_in_at IS NULL AND be2.end_at < NOW() THEN
            COALESCE(tord.total_amount_cents, 0)::numeric / NULLIF(tord.quantity, 0)
          ELSE
            COALESCE(tord.total_amount_cents, 0)::numeric / NULLIF(tord.quantity, 0)
        END
      ) AS spend_cents
    FROM ticket_spend ts2
    JOIN public.ticket_orders tord ON tord.id = ts2.order_id
    JOIN business_events be2 ON be2.id = ts2.event_id
    WHERE ts2.g_id IS NOT NULL
    GROUP BY ts2.g_id
  ),

  reservation_spend AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      r.id AS res_id,
      r.party_size,
      COALESCE(r.prepayment_amount_cents, 0) AS prepay,
      COALESCE(r.actual_spend_cents, 0) AS actual,
      COALESCE(
        (SELECT stt.min_spend_cents
         FROM public.seating_type_tiers stt
         WHERE stt.seating_type_id = r.seating_type_id
           AND stt.tier_size = r.party_size
         LIMIT 1
        ), 0
      ) AS min_charge,
      r.checked_in_at,
      r.event_id
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_orders tord
        WHERE tord.linked_reservation_id = r.id
      )
  ),

  reservation_spend_per_guest AS (
    SELECT
      g_id,
      SUM(
        CASE
          WHEN checked_in_at IS NOT NULL THEN
            GREATEST(prepay, actual, min_charge)::numeric / NULLIF(party_size, 0)
          ELSE
            prepay::numeric / NULLIF(party_size, 0)
        END
      ) AS spend_cents
    FROM reservation_spend
    WHERE g_id IS NOT NULL
    GROUP BY g_id
  ),

  total_spend AS (
    SELECT g_id, COALESCE(SUM(spend_cents), 0)::bigint AS spend_cents
    FROM (
      SELECT g_id, spend_cents FROM ticket_spend_per_guest
      UNION ALL
      SELECT g_id, spend_cents FROM reservation_spend_per_guest
    ) combined
    GROUP BY g_id
  ),

  cancellation_stats AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS total_cancellations
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status = 'cancelled'
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  favorite_table_data AS (
    SELECT
      av.g_id,
      fpt.label AS table_label
    FROM all_visits av
    JOIN public.reservations r ON r.event_id = av.visit_event_id
    JOIN public.reservation_table_assignments rta ON rta.reservation_id = r.id AND rta.event_id = av.visit_event_id
    JOIN public.floor_plan_tables fpt ON fpt.id = rta.table_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE av.g_id IS NOT NULL
      AND (CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END) = av.g_id
  ),

  favorite_table_stats AS (
    SELECT
      g_id,
      MODE() WITHIN GROUP (ORDER BY table_label) AS favorite_table
    FROM favorite_table_data
    WHERE g_id IS NOT NULL
    GROUP BY g_id
  ),

  reservation_party AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      r.party_size
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),

  party_stats AS (
    SELECT
      g_id,
      ROUND(AVG(party_size), 1) AS avg_party_size
    FROM reservation_party
    WHERE g_id IS NOT NULL
    GROUP BY g_id
  ),

  reservation_count AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS total_reservations
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  )

  SELECT
    cg.id AS guest_id,
    COALESCE(vs.total_visits, 0)::bigint,
    COALESCE(ts.spend_cents, 0)::bigint AS total_spend_cents,
    COALESCE(tns.no_shows, 0)::bigint AS total_no_shows,
    COALESCE(cs.total_cancellations, 0)::bigint,
    vs.first_visit,
    vs.last_visit,
    COALESCE(ps.avg_party_size, 0)::numeric,
    fts.favorite_table,
    COALESCE(rc.total_reservations, 0)::bigint
  FROM public.crm_guests cg
  LEFT JOIN visit_stats vs ON vs.g_id = cg.id
  LEFT JOIN total_spend ts ON ts.g_id = cg.id
  LEFT JOIN no_show_stats tns ON tns.g_id = cg.id
  LEFT JOIN cancellation_stats cs ON cs.g_id = cg.id
  LEFT JOIN party_stats ps ON ps.g_id = cg.id
  LEFT JOIN favorite_table_stats fts ON fts.g_id = cg.id
  LEFT JOIN reservation_count rc ON rc.g_id = cg.id
  WHERE cg.business_id = p_business_id;
END;
$function$;
