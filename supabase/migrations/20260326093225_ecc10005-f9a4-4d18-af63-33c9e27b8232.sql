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
SET search_path TO 'public'
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
      (SELECT cg.id FROM public.crm_guests cg
       WHERE cg.business_id = p_business_id
         AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
       LIMIT 1) AS g_id,
      rg.checked_in_at AS visited_at,
      r.event_id AS visit_event_id
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE rg.checked_in_at IS NOT NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),

  reservation_main_visits AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      r.checked_in_at AS visited_at,
      r.event_id AS visit_event_id
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE r.checked_in_at IS NOT NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND NOT EXISTS (SELECT 1 FROM public.ticket_orders tord WHERE tord.linked_reservation_id = r.id)
  ),

  all_visits AS (
    SELECT g_id, visit_event_id, MIN(visited_at) AS visited_at
    FROM (
      SELECT * FROM ticket_visits
      UNION ALL
      SELECT * FROM res_guest_visits
      UNION ALL
      SELECT * FROM reservation_main_visits
    ) raw_v
    WHERE g_id IS NOT NULL
    GROUP BY g_id, visit_event_id
  ),

  visit_stats AS (
    SELECT g_id, COUNT(*)::bigint AS total_visits, MIN(visited_at) AS first_visit, MAX(visited_at) AS last_visit
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
      (SELECT cg.id FROM public.crm_guests cg
       WHERE cg.business_id = p_business_id
         AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
       LIMIT 1) AS g_id,
      r.event_id
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE rg.checked_in_at IS NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND (r.event_id IS NULL OR EXISTS (SELECT 1 FROM business_events be2 WHERE be2.id = r.event_id AND be2.end_at < NOW()))
  ),

  reservation_main_no_shows AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      r.event_id
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE r.checked_in_at IS NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
      AND NOT EXISTS (SELECT 1 FROM public.ticket_orders tord WHERE tord.linked_reservation_id = r.id)
      AND (r.event_id IS NULL OR EXISTS (SELECT 1 FROM business_events be2 WHERE be2.id = r.event_id AND be2.end_at < NOW()))
  ),

  no_show_stats AS (
    SELECT g_id, COUNT(DISTINCT event_id)::bigint AS no_shows
    FROM (
      SELECT * FROM ticket_no_shows
      UNION ALL
      SELECT * FROM res_guest_no_shows
      UNION ALL
      SELECT * FROM reservation_main_no_shows
    ) raw_ns
    WHERE g_id IS NOT NULL
    GROUP BY g_id
  ),

  -- ======== 3-PHASE SPEND LOGIC ========

  biz_reservations AS (
    SELECT
      r.id AS res_id, r.event_id, r.user_id, r.reservation_name,
      r.party_size, r.checked_in_at AS main_checked_in_at, r.seating_type_id,
      COALESCE(r.prepaid_min_charge_cents, 0) AS res_prepayment,
      COALESCE(r.actual_spend_cents, 0) AS actual_spend
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE r.status IN ('accepted', 'completed')
      AND ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  ),

  res_with_ticket AS (
    SELECT br.*,
      tord.id AS ticket_order_id,
      COALESCE(tord.total_cents, 0) AS ticket_order_total
    FROM biz_reservations br
    LEFT JOIN public.ticket_orders tord ON tord.linked_reservation_id = br.res_id
  ),

  pure_participants AS (
    SELECT rwt.res_id, rwt.event_id,
      CASE WHEN rwt.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = rwt.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rwt.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rwt.reservation_name) LIMIT 1)
      END AS g_id,
      (rwt.main_checked_in_at IS NOT NULL) AS is_checked_in
    FROM res_with_ticket rwt
    WHERE rwt.ticket_order_id IS NULL

    UNION ALL

    SELECT rwt.res_id, rwt.event_id,
      (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name) LIMIT 1) AS g_id,
      (rg.checked_in_at IS NOT NULL) AS is_checked_in
    FROM res_with_ticket rwt
    JOIN public.reservation_guests rg ON rg.reservation_id = rwt.res_id
    WHERE rwt.ticket_order_id IS NULL
  ),

  hybrid_participants AS (
    SELECT rwt.res_id, rwt.event_id,
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      (t.checked_in_at IS NOT NULL) AS is_checked_in
    FROM res_with_ticket rwt
    JOIN public.tickets t ON t.order_id = rwt.ticket_order_id
    WHERE rwt.ticket_order_id IS NOT NULL
      AND COALESCE(t.status::text, '') <> 'cancelled'
  ),

  all_res_participants AS (
    SELECT res_id, event_id, g_id, BOOL_OR(is_checked_in) AS is_checked_in
    FROM (
      SELECT * FROM pure_participants
      UNION ALL
      SELECT * FROM hybrid_participants
    ) raw_p
    WHERE g_id IS NOT NULL
    GROUP BY res_id, event_id, g_id
  ),

  res_formula AS (
    SELECT
      rwt.res_id,
      rwt.party_size,
      CASE WHEN rwt.ticket_order_id IS NOT NULL THEN rwt.ticket_order_total ELSE rwt.res_prepayment END AS prepayment_cents,
      rwt.actual_spend AS actual_spend_cents,
      COALESCE(
        (SELECT stt.prepaid_min_charge_cents
         FROM public.seating_type_tiers stt
         WHERE stt.seating_type_id = rwt.seating_type_id
           AND rwt.party_size BETWEEN stt.min_people AND stt.max_people
         LIMIT 1), 0
      ) AS min_charge_cents,
      CASE
        WHEN rwt.event_id IS NULL THEN TRUE
        ELSE COALESCE((SELECT be.end_at < NOW() FROM business_events be WHERE be.id = rwt.event_id), TRUE)
      END AS event_ended,
      CASE WHEN rwt.ticket_order_id IS NULL THEN
        (CASE WHEN rwt.main_checked_in_at IS NOT NULL THEN 1 ELSE 0 END)
        + COALESCE((SELECT COUNT(*)::int FROM public.reservation_guests rg2 WHERE rg2.reservation_id = rwt.res_id AND rg2.checked_in_at IS NOT NULL), 0)
      ELSE
        COALESCE((SELECT COUNT(*)::int FROM public.tickets t2 WHERE t2.order_id = rwt.ticket_order_id AND t2.checked_in_at IS NOT NULL AND COALESCE(t2.status::text, '') <> 'cancelled'), 0)
      END AS checked_in_count
    FROM res_with_ticket rwt
  ),

  res_computed AS (
    SELECT
      rf.res_id,
      rf.event_ended,
      CASE WHEN rf.party_size > 0 THEN rf.prepayment_cents::numeric / rf.party_size ELSE 0 END AS prepay_pp,
      CASE
        WHEN rf.actual_spend_cents > 0 THEN rf.actual_spend_cents
        WHEN rf.min_charge_cents > 0 THEN rf.min_charge_cents
        ELSE rf.prepayment_cents
      END AS target_cents,
      rf.checked_in_count,
      GREATEST(0, rf.party_size - rf.checked_in_count)::int AS no_show_count
    FROM res_formula rf
  ),

  participant_spend AS (
    SELECT
      arp.g_id,
      CASE
        WHEN NOT rc.event_ended THEN rc.prepay_pp
        WHEN NOT arp.is_checked_in THEN rc.prepay_pp
        WHEN rc.checked_in_count > 0 THEN
          GREATEST(0, (rc.target_cents::numeric - rc.no_show_count * rc.prepay_pp)) / rc.checked_in_count
        ELSE 0
      END AS spend_cents
    FROM all_res_participants arp
    JOIN res_computed rc ON rc.res_id = arp.res_id
  ),

  total_spend AS (
    SELECT g_id, COALESCE(SUM(spend_cents), 0)::bigint AS spend_cents
    FROM participant_spend
    GROUP BY g_id
  ),

  cancellation_stats AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      COUNT(*)::bigint AS total_cancellations
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status = 'cancelled'
    GROUP BY 1
  ),

  favorite_table_data AS (
    SELECT arp.g_id, fpt.label AS table_label
    FROM all_res_participants arp
    JOIN public.reservation_table_assignments rta ON rta.reservation_id = arp.res_id
    JOIN public.floor_plan_tables fpt ON fpt.id = rta.table_id
    WHERE arp.is_checked_in
  ),

  favorite_table_stats AS (
    SELECT g_id, MODE() WITHIN GROUP (ORDER BY table_label) AS favorite_table
    FROM favorite_table_data
    WHERE g_id IS NOT NULL
    GROUP BY g_id
  ),

  reservation_party AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      r.party_size
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id)
           OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),

  party_stats AS (
    SELECT g_id, ROUND(AVG(party_size), 1) AS avg_party_size
    FROM reservation_party WHERE g_id IS NOT NULL GROUP BY g_id
  ),

  reservation_count AS (
    SELECT g_id, COUNT(*)::bigint AS total_reservations
    FROM reservation_party WHERE g_id IS NOT NULL GROUP BY g_id
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