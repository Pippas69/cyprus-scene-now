
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
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH business_events AS (
    SELECT e.id, e.end_at FROM public.events e WHERE e.business_id = p_business_id
  ),

  -- ======== VISITS ========
  ticket_visits AS (
    SELECT
      public.resolve_crm_guest_for_ticket(
        p_business_id,
        CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END,
        t.guest_name
      ) AS g_id,
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
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  ),

  -- Event reservation booker visit (covers manual entries without reservation_guests)
  event_booker_visits AS (
    SELECT
      CASE WHEN r.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN
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
    JOIN public.events e ON e.id = r.event_id
    WHERE e.business_id = p_business_id
      AND r.checked_in_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
      AND NOT EXISTS (SELECT 1 FROM public.ticket_orders o WHERE o.linked_reservation_id = r.id)
  ),

  booker_direct_visits AS (
    SELECT
      CASE WHEN r.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      r.checked_in_at AS visited_at,
      NULL::uuid AS visit_event_id
    FROM public.reservations r
    WHERE r.business_id = p_business_id
      AND r.event_id IS NULL
      AND r.checked_in_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.offer_purchases op WHERE op.reservation_id = r.id)
      AND POSITION('offer claim:' IN lower(COALESCE(r.special_requests, ''))) = 0
      AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
  ),

  offer_visits AS (
    SELECT
      CASE WHEN op.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = op.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(op.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(op.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name) LIMIT 1)
      END AS g_id,
      op.redeemed_at AS visited_at,
      NULL::uuid AS visit_event_id
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    WHERE d.business_id = p_business_id
      AND op.redeemed_at IS NOT NULL
  ),

  student_visits AS (
    SELECT
      (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = sv.user_id LIMIT 1) AS g_id,
      sdr.created_at AS visited_at,
      NULL::uuid AS visit_event_id
    FROM public.student_discount_redemptions sdr
    JOIN public.student_verifications sv ON sv.id = sdr.student_verification_id
    WHERE sdr.business_id = p_business_id
  ),

  raw_visits AS (
    SELECT g_id, visited_at, visit_event_id FROM ticket_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM res_guest_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM event_booker_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM booker_direct_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM offer_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM student_visits WHERE g_id IS NOT NULL
  ),

  all_visits AS (
    SELECT g_id, MIN(visited_at) AS visited_at, visit_event_id
    FROM raw_visits WHERE visit_event_id IS NOT NULL
    GROUP BY g_id, visit_event_id
    UNION ALL
    SELECT g_id, visited_at, visit_event_id
    FROM raw_visits WHERE visit_event_id IS NULL
  ),

  visit_stats AS (
    SELECT g_id, COUNT(*)::bigint AS total_visits, MIN(visited_at) AS first_visit, MAX(visited_at) AS last_visit
    FROM all_visits GROUP BY g_id
  ),

  -- ======== NO-SHOWS ========
  ticket_no_shows AS (
    SELECT
      public.resolve_crm_guest_for_ticket(
        p_business_id,
        CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END,
        t.guest_name
      ) AS g_id,
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
    JOIN public.events e ON e.id = r.event_id
    WHERE e.business_id = p_business_id
      AND r.status = 'accepted'
      AND e.end_at < NOW()
      AND rg.checked_in_at IS NULL
  ),

  booker_no_shows AS (
    SELECT
      CASE WHEN r.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      r.event_id
    FROM public.reservations r
    JOIN public.events e ON e.id = r.event_id
    WHERE e.business_id = p_business_id
      AND r.status = 'accepted'
      AND e.end_at < NOW()
      AND r.checked_in_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.ticket_orders o WHERE o.linked_reservation_id = r.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.event_id = r.event_id AND t.user_id = r.user_id
          AND t.checked_in_at IS NOT NULL AND r.user_id IS NOT NULL
          AND r.is_manual_entry = false
      )
  ),

  legacy_no_shows AS (
    SELECT
      CASE WHEN r.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      END AS g_id,
      NULL::uuid AS event_id
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status = 'no_show'
      AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
  ),

  all_no_shows AS (
    SELECT g_id, event_id FROM ticket_no_shows WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, event_id FROM res_guest_no_shows WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, event_id FROM booker_no_shows WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, event_id FROM legacy_no_shows WHERE g_id IS NOT NULL
  ),

  deduped_no_shows AS (
    SELECT g_id, event_id FROM all_no_shows WHERE event_id IS NOT NULL GROUP BY g_id, event_id
    UNION ALL
    SELECT g_id, event_id FROM all_no_shows WHERE event_id IS NULL
  ),

  no_show_stats AS (
    SELECT g_id, COUNT(*)::bigint AS no_shows FROM deduped_no_shows GROUP BY g_id
  ),

  -- ======== CANCELLATIONS ========
  cancellation_stats AS (
    SELECT
      CASE WHEN r.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN
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
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status = 'cancelled'
    GROUP BY 1
  ),

  -- ======== 3-PHASE SPEND LOGIC ========
  biz_reservations AS (
    SELECT
      r.id AS res_id, r.event_id, r.user_id, r.reservation_name,
      COALESCE(r.party_size, 1) AS party_size,
      r.checked_in_at AS main_checked_in_at, r.seating_type_id,
      COALESCE(r.prepaid_min_charge_cents, 0) AS res_prepayment,
      COALESCE(r.actual_spend_cents, 0) AS actual_spend,
      r.is_manual_entry
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed', 'no_show')
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
      CASE WHEN rwt.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rwt.reservation_name) LIMIT 1)
      WHEN rwt.user_id IS NOT NULL THEN
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
  ),

  pure_guest_participants AS (
    SELECT rwt.res_id, rwt.event_id,
      (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name) LIMIT 1) AS g_id,
      (rg.checked_in_at IS NOT NULL) AS is_checked_in
    FROM res_with_ticket rwt
    JOIN public.reservation_guests rg ON rg.reservation_id = rwt.res_id
    WHERE rwt.ticket_order_id IS NULL
  ),

  hybrid_participants AS (
    SELECT rwt.res_id, rwt.event_id,
      public.resolve_crm_guest_for_ticket(
        p_business_id,
        CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END,
        t.guest_name
      ) AS g_id,
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
      UNION ALL SELECT * FROM pure_guest_participants
      UNION ALL SELECT * FROM hybrid_participants
    ) raw_p
    WHERE g_id IS NOT NULL
    GROUP BY res_id, event_id, g_id
  ),

  res_formula AS (
    SELECT
      rwt.res_id,
      rwt.party_size,
      CASE
        WHEN rwt.is_manual_entry = true AND rwt.ticket_order_id IS NULL THEN 1
        ELSE GREATEST(1, rwt.party_size)
      END AS effective_party_size,
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
      rf.checked_in_count,
      CASE WHEN rf.effective_party_size > 0 THEN rf.prepayment_cents::numeric / rf.effective_party_size ELSE 0 END AS prepay_pp,
      CASE
        WHEN rf.actual_spend_cents > 0 THEN rf.actual_spend_cents
        WHEN rf.min_charge_cents > 0 THEN rf.min_charge_cents
        ELSE rf.prepayment_cents
      END AS target_cents,
      GREATEST(0, rf.effective_party_size - rf.checked_in_count)::int AS no_show_count
    FROM res_formula rf
  ),

  participant_spend AS (
    SELECT
      arp.g_id,
      CASE
        WHEN NOT rc.event_ended AND rc.checked_in_count = 0 THEN rc.prepay_pp
        WHEN NOT arp.is_checked_in THEN rc.prepay_pp
        WHEN rc.checked_in_count > 0 THEN
          GREATEST(0, (rc.target_cents::numeric - rc.no_show_count * rc.prepay_pp)) / rc.checked_in_count
        ELSE 0
      END AS spend_cents
    FROM all_res_participants arp
    JOIN res_computed rc ON rc.res_id = arp.res_id
  ),

  reservation_spend AS (
    SELECT g_id, COALESCE(SUM(spend_cents), 0)::bigint AS spend_cents
    FROM participant_spend GROUP BY g_id
  ),

  standalone_ticket_spend AS (
    SELECT
      public.resolve_crm_guest_for_ticket(
        p_business_id,
        CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END,
        t.guest_name
      ) AS g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
    WHERE t.status::text IN ('valid', 'used')
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_orders tord
        WHERE tord.id = t.order_id AND tord.linked_reservation_id IS NOT NULL
      )
    GROUP BY public.resolve_crm_guest_for_ticket(
      p_business_id,
      CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END,
      t.guest_name
    )
  ),

  offer_spend AS (
    SELECT
      CASE WHEN op.user_id IS NOT NULL THEN
        COALESCE(
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = op.user_id LIMIT 1),
          (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(op.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name) LIMIT 1)
        )
      ELSE
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(op.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name) LIMIT 1)
      END AS g_id,
      SUM(COALESCE(op.final_price_cents, 0))::bigint AS spend_cents
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    WHERE d.business_id = p_business_id AND op.status = 'paid'
    GROUP BY 1
  ),

  total_spend AS (
    SELECT g_id, SUM(spend_cents)::bigint AS spend_cents
    FROM (
      SELECT g_id, spend_cents FROM reservation_spend WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, spend_cents FROM standalone_ticket_spend WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, spend_cents FROM offer_spend WHERE g_id IS NOT NULL
    ) s
    GROUP BY g_id
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
    FROM favorite_table_data WHERE g_id IS NOT NULL GROUP BY g_id
  ),

  reservation_party AS (
    SELECT
      CASE WHEN r.is_manual_entry THEN
        (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1)
      WHEN r.user_id IS NOT NULL THEN
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
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed', 'no_show')
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
    CASE WHEN cg.spend_override_cents IS NOT NULL THEN cg.spend_override_cents ELSE COALESCE(ts.spend_cents, 0) END::bigint AS total_spend_cents,
    COALESCE(tns.no_shows, 0)::bigint AS total_no_shows,
    COALESCE(cs.total_cancellations, 0)::bigint,
    vs.first_visit,
    vs.last_visit,
    COALESCE(ps.avg_party_size, 0)::numeric,
    COALESCE(cg.favorite_table_override, fts.favorite_table) AS favorite_table,
    COALESCE(rc.total_reservations, 0)::bigint
  FROM public.crm_guests cg
  LEFT JOIN visit_stats vs ON vs.g_id = cg.id
  LEFT JOIN total_spend ts ON ts.g_id = cg.id
  LEFT JOIN no_show_stats tns ON tns.g_id = cg.id
  LEFT JOIN cancellation_stats cs ON cs.g_id = cg.id
  LEFT JOIN favorite_table_stats fts ON fts.g_id = cg.id
  LEFT JOIN party_stats ps ON ps.g_id = cg.id
  LEFT JOIN reservation_count rc ON rc.g_id = cg.id
  WHERE cg.business_id = p_business_id;
END;
$$;
