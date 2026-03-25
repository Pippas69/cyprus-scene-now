
-- Fix CRM ticket visit attribution: remove overly-restrictive name matching from user_match
-- Problem: Philip's ticket scan didn't show as visit because user_match required name to match profile name
-- Fix: If ticket has user_id and CRM guest has same user_id, always match (no name check needed)

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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH business_events AS (
    SELECT e.id
    FROM public.events e
    WHERE e.business_id = p_business_id
  ),
  direct_res_checkins AS (
    SELECT r.id, r.user_id, r.reservation_name, r.phone_number, r.checked_in_at
    FROM public.reservations r
    WHERE r.business_id = p_business_id
      AND r.event_id IS NULL
      AND r.checked_in_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.offer_purchases op
        WHERE op.reservation_id = r.id
          AND op.reservation_id IS NOT NULL
      )
      AND POSITION('offer claim:' IN lower(COALESCE(r.special_requests, ''))) = 0
  ),
  ticket_visits AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      t.checked_in_at AS visited_at,
      t.event_id AS visit_event_id,
      t.user_id AS visit_user_id
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    -- FIXED: user_match no longer requires name to match profile name.
    -- If ticket has user_id and a CRM guest exists with that user_id, always match.
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = t.user_id
        AND t.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name)
      LIMIT 1
    ) name_match ON user_match.id IS NULL AND public.normalize_guest_identity(t.guest_name) IS NOT NULL
    WHERE t.checked_in_at IS NOT NULL
  ),
  profile_res_visits AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      r.checked_in_at AS visited_at,
      NULL::uuid AS visit_event_id,
      r.user_id AS visit_user_id
    FROM direct_res_checkins r
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(r.phone_number, '')), ''), '')
      LIMIT 1
    ) name_match ON user_match.id IS NULL
  ),
  event_res_visits AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      r.checked_in_at AS visited_at,
      r.event_id AS visit_event_id,
      r.user_id AS visit_user_id
    FROM public.reservations r
    JOIN business_events be ON be.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON user_match.id IS NULL
    WHERE r.checked_in_at IS NOT NULL
      AND COALESCE(r.auto_created_from_tickets, false) = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.ticket_orders tor
        WHERE tor.linked_reservation_id = r.id
      )
  ),
  offer_visits AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      op.redeemed_at AS visited_at,
      NULL::uuid AS visit_event_id,
      op.user_id AS visit_user_id
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
        AND op.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name)
      LIMIT 1
    ) name_match ON user_match.id IS NULL AND public.normalize_guest_identity(op.guest_name) IS NOT NULL
    WHERE d.business_id = p_business_id
      AND op.redeemed_at IS NOT NULL
  ),
  student_visits AS (
    SELECT
      user_match.id AS g_id,
      sdr.created_at AS visited_at,
      NULL::uuid AS visit_event_id,
      sv.user_id AS visit_user_id
    FROM public.student_discount_redemptions sdr
    JOIN public.student_verifications sv ON sv.id = sdr.student_verification_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = sv.user_id
      LIMIT 1
    ) user_match ON TRUE
    WHERE sdr.business_id = p_business_id
  ),
  raw_visits AS (
    SELECT g_id, visited_at, visit_event_id, visit_user_id FROM ticket_visits WHERE g_id IS NOT NULL
    UNION ALL
    SELECT g_id, visited_at, visit_event_id, visit_user_id FROM profile_res_visits WHERE g_id IS NOT NULL
    UNION ALL
    SELECT g_id, visited_at, visit_event_id, visit_user_id FROM event_res_visits WHERE g_id IS NOT NULL
    UNION ALL
    SELECT g_id, visited_at, visit_event_id, visit_user_id FROM offer_visits WHERE g_id IS NOT NULL
    UNION ALL
    SELECT g_id, visited_at, visit_event_id, visit_user_id FROM student_visits WHERE g_id IS NOT NULL
  ),
  all_visits AS (
    SELECT DISTINCT ON (g_id, COALESCE(visit_event_id, gen_random_uuid()))
      g_id, visited_at
    FROM raw_visits
    ORDER BY g_id, COALESCE(visit_event_id, gen_random_uuid()), visited_at
  ),
  visit_stats AS (
    SELECT
      v.g_id,
      COUNT(*)::bigint AS v_visits,
      MIN(v.visited_at) AS v_first,
      MAX(v.visited_at) AS v_last
    FROM all_visits v
    GROUP BY v.g_id
  ),
  reservation_map AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      r.status,
      r.party_size
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(r.phone_number, '')), ''), '')
      LIMIT 1
    ) name_match ON user_match.id IS NULL
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND (r.event_id IS NULL OR COALESCE(r.auto_created_from_tickets, false) = false)
  ),
  reservation_stats AS (
    SELECT
      rm.g_id,
      COUNT(*) FILTER (WHERE rm.status = 'declined')::bigint AS v_noshows,
      COUNT(*) FILTER (WHERE rm.status = 'cancelled')::bigint AS v_cancels,
      COUNT(*)::bigint AS v_total,
      AVG(rm.party_size) FILTER (WHERE rm.status = 'accepted') AS v_party
    FROM reservation_map rm
    WHERE rm.g_id IS NOT NULL
    GROUP BY rm.g_id
  ),
  ticket_spend AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = t.user_id
        AND t.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name)
      LIMIT 1
    ) name_match ON user_match.id IS NULL AND public.normalize_guest_identity(t.guest_name) IS NOT NULL
    WHERE t.status::text IN ('valid', 'used')
    GROUP BY COALESCE(user_match.id, name_match.id)
  ),
  reservation_spend AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      SUM(COALESCE(r.prepaid_min_charge_cents, 0))::bigint AS spend_cents
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON user_match.id IS NULL
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND r.status = 'accepted'
    GROUP BY COALESCE(user_match.id, name_match.id)
  ),
  offer_spend AS (
    SELECT
      COALESCE(user_match.id, name_match.id) AS g_id,
      SUM(COALESCE(op.final_price_cents, 0))::bigint AS spend_cents
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
        AND op.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name)
      LIMIT 1
    ) name_match ON user_match.id IS NULL AND public.normalize_guest_identity(op.guest_name) IS NOT NULL
    WHERE d.business_id = p_business_id
      AND op.status = 'paid'
    GROUP BY COALESCE(user_match.id, name_match.id)
  ),
  total_spend AS (
    SELECT g_id, SUM(spend_cents)::bigint AS spend_cents
    FROM (
      SELECT g_id, spend_cents FROM ticket_spend WHERE g_id IS NOT NULL
      UNION ALL
      SELECT g_id, spend_cents FROM reservation_spend WHERE g_id IS NOT NULL
      UNION ALL
      SELECT g_id, spend_cents FROM offer_spend WHERE g_id IS NOT NULL
    ) s
    GROUP BY g_id
  ),
  fav_table AS (
    SELECT DISTINCT ON (sub.g_id) sub.g_id, sub.tbl_label AS fav
    FROM (
      SELECT
        COALESCE(user_match.id, name_match.id) AS g_id,
        fpt.label AS tbl_label,
        COUNT(*) AS cnt
      FROM public.reservations r
      LEFT JOIN public.events e ON e.id = r.event_id
      JOIN public.reservation_table_assignments rta ON r.id = rta.reservation_id
      JOIN public.floor_plan_tables fpt ON rta.table_id = fpt.id
      LEFT JOIN LATERAL (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id = r.user_id
          AND r.user_id IS NOT NULL
        LIMIT 1
      ) user_match ON TRUE
      LEFT JOIN LATERAL (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id IS NULL
          AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        LIMIT 1
      ) name_match ON user_match.id IS NULL
      WHERE fpt.business_id = p_business_id
        AND (
          (r.event_id IS NULL AND r.business_id = p_business_id)
          OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
        )
      GROUP BY COALESCE(user_match.id, name_match.id), fpt.label
    ) sub
    WHERE sub.g_id IS NOT NULL
    ORDER BY sub.g_id, sub.cnt DESC
  )
  SELECT
    cg.id AS guest_id,
    COALESCE(vs.v_visits, 0)::bigint AS total_visits,
    COALESCE(ts.spend_cents, 0)::bigint AS total_spend_cents,
    COALESCE(rs.v_noshows, 0)::bigint AS total_no_shows,
    COALESCE(rs.v_cancels, 0)::bigint AS total_cancellations,
    vs.v_first AS first_visit,
    vs.v_last AS last_visit,
    ROUND(COALESCE(rs.v_party, 0), 1) AS avg_party_size,
    ft.fav AS favorite_table,
    COALESCE(rs.v_total, 0)::bigint AS total_reservations
  FROM public.crm_guests cg
  LEFT JOIN visit_stats vs ON vs.g_id = cg.id
  LEFT JOIN total_spend ts ON ts.g_id = cg.id
  LEFT JOIN reservation_stats rs ON rs.g_id = cg.id
  LEFT JOIN fav_table ft ON ft.g_id = cg.id
  WHERE cg.business_id = p_business_id;
END;
$$;
