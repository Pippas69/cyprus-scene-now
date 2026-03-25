
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH business_events AS (
    SELECT e.id, e.end_at FROM public.events e WHERE e.business_id = p_business_id
  ),

  -- VISITS: per-person check-in
  ticket_visits AS (
    SELECT
      CASE WHEN t.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      t.checked_in_at AS visited_at, t.event_id AS visit_event_id
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(t.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = t.user_id AND t.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE t.checked_in_at IS NOT NULL
  ),

  res_guest_visits AS (
    SELECT nm.id AS g_id, rg.checked_in_at AS visited_at, r.event_id AS visit_event_id
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name) LIMIT 1) nm ON TRUE
    WHERE rg.checked_in_at IS NOT NULL
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
  ),

  booker_direct_visits AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      r.checked_in_at AS visited_at, NULL::uuid AS visit_event_id
    FROM public.reservations r
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(r.phone_number, '')), ''), '') LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE r.business_id = p_business_id
      AND r.event_id IS NULL
      AND r.checked_in_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.offer_purchases op WHERE op.reservation_id = r.id)
      AND POSITION('offer claim:' IN lower(COALESCE(r.special_requests, ''))) = 0
      AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
  ),

  offer_visits AS (
    SELECT
      CASE WHEN op.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      op.redeemed_at AS visited_at, NULL::uuid AS visit_event_id
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(op.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = op.user_id AND op.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE d.business_id = p_business_id AND op.redeemed_at IS NOT NULL
  ),

  student_visits AS (
    SELECT um.id AS g_id, sdr.created_at AS visited_at, NULL::uuid AS visit_event_id
    FROM public.student_discount_redemptions sdr
    JOIN public.student_verifications sv ON sv.id = sdr.student_verification_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = sv.user_id LIMIT 1) um ON TRUE
    WHERE sdr.business_id = p_business_id
  ),

  raw_visits AS (
    SELECT g_id, visited_at, visit_event_id FROM ticket_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM res_guest_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM booker_direct_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM offer_visits WHERE g_id IS NOT NULL
    UNION ALL SELECT g_id, visited_at, visit_event_id FROM student_visits WHERE g_id IS NOT NULL
  ),
  all_visits AS (
    SELECT DISTINCT ON (g_id, COALESCE(visit_event_id, gen_random_uuid()))
      g_id, visited_at, visit_event_id
    FROM raw_visits WHERE g_id IS NOT NULL
    ORDER BY g_id, COALESCE(visit_event_id, gen_random_uuid()), visited_at ASC
  ),
  visit_stats AS (
    SELECT g_id, COUNT(*)::bigint AS total_visits, MIN(visited_at) AS first_visit, MAX(visited_at) AS last_visit
    FROM all_visits GROUP BY g_id
  ),

  -- SPEND: tickets per-person, reservations split by party_size
  ticket_spend AS (
    SELECT
      CASE WHEN t.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(t.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = t.user_id AND t.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE t.status::text IN ('valid', 'used')
    GROUP BY CASE WHEN t.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  reservation_spend_base AS (
    SELECT r.id AS reservation_id,
      GREATEST(COALESCE(r.party_size, 1), 1) AS party_size,
      COALESCE(NULLIF(r.actual_spend_cents, 0), r.prepaid_min_charge_cents, r.ticket_credit_cents, 0) AS total_spend_cents,
      r.user_id, r.reservation_name, r.phone_number
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),
  reservation_main_participant AS (
    SELECT rsb.reservation_id,
      CASE WHEN rsb.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id
    FROM reservation_spend_base rsb
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rsb.reservation_name) AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(rsb.phone_number, '')), ''), '') LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = rsb.user_id AND rsb.user_id IS NOT NULL LIMIT 1) um ON TRUE
  ),
  reservation_guest_participants AS (
    SELECT rsb.reservation_id, nm.id AS g_id
    FROM reservation_spend_base rsb
    JOIN public.reservation_guests rg ON rg.reservation_id = rsb.reservation_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name) LIMIT 1) nm ON TRUE
    WHERE nm.id IS NOT NULL
  ),
  reservation_participants AS (
    SELECT DISTINCT reservation_id, g_id FROM (
      SELECT reservation_id, g_id FROM reservation_main_participant WHERE g_id IS NOT NULL
      UNION ALL SELECT reservation_id, g_id FROM reservation_guest_participants WHERE g_id IS NOT NULL
    ) p
  ),
  reservation_spend AS (
    SELECT rp.g_id, SUM(ROUND((rsb.total_spend_cents::numeric) / (rsb.party_size::numeric), 0))::bigint AS spend_cents
    FROM reservation_participants rp
    JOIN reservation_spend_base rsb ON rsb.reservation_id = rp.reservation_id
    GROUP BY rp.g_id
  ),

  offer_spend AS (
    SELECT
      CASE WHEN op.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      SUM(COALESCE(op.final_price_cents, 0))::bigint AS spend_cents
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(op.guest_name) IS NOT NULL AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = op.user_id AND op.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE d.business_id = p_business_id AND op.status = 'paid'
    GROUP BY CASE WHEN op.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  total_spend AS (
    SELECT g_id, SUM(spend_cents)::bigint AS spend_cents FROM (
      SELECT g_id, spend_cents FROM ticket_spend WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, spend_cents FROM reservation_spend WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, spend_cents FROM offer_spend WHERE g_id IS NOT NULL
    ) s GROUP BY g_id
  ),

  -- NO-SHOWS: per individual guest after event ends
  event_guest_no_shows AS (
    SELECT nm.id AS g_id, COUNT(*)::bigint AS no_shows
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name) LIMIT 1) nm ON TRUE
    WHERE e.business_id = p_business_id
      AND r.status = 'accepted'
      AND e.end_at < now()
      AND rg.checked_in_at IS NULL
      AND nm.id IS NOT NULL
    GROUP BY nm.id
  ),

  -- Also check booker no-show for events with reservation_guests (booker is not in reservation_guests)
  event_booker_no_shows AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS no_shows
    FROM public.reservations r
    JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE e.business_id = p_business_id
      AND r.status = 'accepted'
      AND e.end_at < now()
      AND r.checked_in_at IS NULL
      -- Booker not checked in via tickets either
      AND NOT EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.event_id = r.event_id
          AND t.user_id = r.user_id
          AND t.checked_in_at IS NOT NULL
          AND r.user_id IS NOT NULL
      )
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  legacy_no_shows AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS no_shows
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status = 'no_show'
      AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  no_show_stats AS (
    SELECT g_id, SUM(no_shows)::bigint AS no_shows FROM (
      SELECT g_id, no_shows FROM event_guest_no_shows
      UNION ALL SELECT g_id, no_shows FROM event_booker_no_shows WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, no_shows FROM legacy_no_shows WHERE g_id IS NOT NULL
    ) ns GROUP BY g_id
  ),

  -- CANCELLATIONS (reservation-level, unchanged)
  cancellation_stats AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS cancellations
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status = 'cancelled'
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  -- FAVORITE TABLE: only from confirmed personal check-ins
  fav_table AS (
    SELECT DISTINCT ON (sub.g_id) sub.g_id, sub.tbl_label AS fav
    FROM (
      SELECT nm.id AS g_id, fpt.label AS tbl_label, COUNT(*) AS cnt
      FROM public.reservation_guests rg
      JOIN public.reservations r ON r.id = rg.reservation_id
      LEFT JOIN public.events e ON e.id = r.event_id
      JOIN public.reservation_table_assignments rta ON r.id = rta.reservation_id
      JOIN public.floor_plan_tables fpt ON rta.table_id = fpt.id
      LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name) LIMIT 1) nm ON TRUE
      WHERE rg.checked_in_at IS NOT NULL AND nm.id IS NOT NULL
        AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      GROUP BY nm.id, fpt.label
      UNION ALL
      SELECT
        CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
        fpt.label AS tbl_label, COUNT(*) AS cnt
      FROM public.reservations r
      LEFT JOIN public.events e ON e.id = r.event_id
      JOIN public.reservation_table_assignments rta ON r.id = rta.reservation_id
      JOIN public.floor_plan_tables fpt ON rta.table_id = fpt.id
      LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1) nm ON TRUE
      LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
      WHERE r.checked_in_at IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
        AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END, fpt.label
    ) sub
    WHERE sub.g_id IS NOT NULL
    ORDER BY sub.g_id, sub.cnt DESC
  ),

  -- RESERVATION COUNT & PARTY STATS (reservation-level)
  reservation_count AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS total_res
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),
  party_stats AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      AVG(COALESCE(r.party_size, 1))::numeric AS avg_party
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name) LIMIT 1) nm ON TRUE
    LEFT JOIN LATERAL (SELECT cg.id FROM public.crm_guests cg WHERE cg.business_id = p_business_id AND cg.user_id = r.user_id AND r.user_id IS NOT NULL LIMIT 1) um ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  )

  SELECT cg.id AS guest_id,
    COALESCE(vs.total_visits, 0), COALESCE(ts.spend_cents, 0),
    COALESCE(ns.no_shows, 0), COALESCE(cs.cancellations, 0),
    vs.first_visit, vs.last_visit,
    COALESCE(ps.avg_party, 0), ft.fav, COALESCE(rc.total_res, 0)
  FROM public.crm_guests cg
  LEFT JOIN visit_stats vs ON vs.g_id = cg.id
  LEFT JOIN total_spend ts ON ts.g_id = cg.id
  LEFT JOIN no_show_stats ns ON ns.g_id = cg.id
  LEFT JOIN cancellation_stats cs ON cs.g_id = cg.id
  LEFT JOIN party_stats ps ON ps.g_id = cg.id
  LEFT JOIN fav_table ft ON ft.g_id = cg.id
  LEFT JOIN reservation_count rc ON rc.g_id = cg.id
  WHERE cg.business_id = p_business_id;
END;
$$;
