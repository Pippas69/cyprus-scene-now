
DROP FUNCTION IF EXISTS public.get_crm_guest_stats(uuid);

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
    SELECT e.id
    FROM public.events e
    WHERE e.business_id = p_business_id
  ),
  ticket_identity AS (
    SELECT
      t.id AS ticket_id,
      t.event_id,
      t.checked_in_at,
      t.status,
      t.tier_id,
      CASE
        WHEN t.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(t.guest_name) IS NOT NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = t.user_id
        AND t.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
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
      ti.g_id,
      ti.checked_in_at AS visited_at,
      ti.event_id AS visit_event_id,
      NULL::uuid AS visit_user_id
    FROM ticket_identity ti
    WHERE ti.checked_in_at IS NOT NULL
      AND ti.g_id IS NOT NULL
  ),
  profile_res_visits AS (
    SELECT
      CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      r.checked_in_at AS visited_at,
      NULL::uuid AS visit_event_id,
      r.user_id AS visit_user_id
    FROM direct_res_checkins r
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(r.phone_number, '')), ''), '')
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
  ),
  event_res_visits AS (
    SELECT
      CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      r.checked_in_at AS visited_at,
      r.event_id AS visit_event_id,
      r.user_id AS visit_user_id
    FROM public.reservations r
    JOIN business_events be ON be.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
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
      CASE
        WHEN op.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      op.redeemed_at AS visited_at,
      NULL::uuid AS visit_event_id,
      op.user_id AS visit_user_id
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(op.guest_name) IS NOT NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
        AND op.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
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
    SELECT g_id, visited_at, visit_event_id, visit_user_id FROM ticket_visits
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
      g_id, visited_at, visit_event_id, visit_user_id
    FROM raw_visits
    WHERE g_id IS NOT NULL
    ORDER BY g_id, COALESCE(visit_event_id, gen_random_uuid()), visited_at ASC
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
  ticket_spend AS (
    SELECT
      ti.g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM ticket_identity ti
    LEFT JOIN public.ticket_tiers tt ON tt.id = ti.tier_id
    WHERE ti.g_id IS NOT NULL
      AND ti.status::text IN ('valid', 'used')
    GROUP BY ti.g_id
  ),
  reservation_spend_base AS (
    SELECT
      r.id AS reservation_id,
      GREATEST(COALESCE(r.party_size, 1), 1) AS party_size,
      COALESCE(NULLIF(r.actual_spend_cents, 0), r.prepaid_min_charge_cents, r.ticket_credit_cents, 0) AS total_spend_cents,
      r.user_id,
      r.reservation_name,
      r.phone_number
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND r.status = 'accepted'
  ),
  reservation_main_participant AS (
    SELECT
      rsb.reservation_id,
      CASE
        WHEN rsb.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id
    FROM reservation_spend_base rsb
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rsb.reservation_name)
        AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(rsb.phone_number, '')), ''), '')
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = rsb.user_id
        AND rsb.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
  ),
  reservation_guest_participants AS (
    SELECT
      rsb.reservation_id,
      name_match.id AS g_id
    FROM reservation_spend_base rsb
    JOIN public.reservation_guests rg ON rg.reservation_id = rsb.reservation_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
      LIMIT 1
    ) name_match ON TRUE
    WHERE name_match.id IS NOT NULL
  ),
  reservation_participants AS (
    SELECT DISTINCT reservation_id, g_id
    FROM (
      SELECT reservation_id, g_id FROM reservation_main_participant WHERE g_id IS NOT NULL
      UNION ALL
      SELECT reservation_id, g_id FROM reservation_guest_participants WHERE g_id IS NOT NULL
    ) p
  ),
  reservation_spend AS (
    SELECT
      rp.g_id,
      SUM(ROUND((rsb.total_spend_cents::numeric) / (rsb.party_size::numeric), 0))::bigint AS spend_cents
    FROM reservation_participants rp
    JOIN reservation_spend_base rsb ON rsb.reservation_id = rp.reservation_id
    GROUP BY rp.g_id
  ),
  offer_spend AS (
    SELECT
      CASE
        WHEN op.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      SUM(COALESCE(op.final_price_cents, 0))::bigint AS spend_cents
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(op.guest_name) IS NOT NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
        AND op.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    WHERE d.business_id = p_business_id
      AND op.status = 'paid'
    GROUP BY CASE
      WHEN op.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
      ELSE name_match.id
    END
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
        CASE
          WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
          ELSE name_match.id
        END AS g_id,
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
          AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        LIMIT 1
      ) name_match ON TRUE
      LEFT JOIN LATERAL (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id = r.user_id
          AND r.user_id IS NOT NULL
        LIMIT 1
      ) user_match ON TRUE
      WHERE (
        (r.event_id IS NULL AND r.business_id = p_business_id)
        OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
      )
      GROUP BY CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END, fpt.label
    ) sub
    WHERE sub.g_id IS NOT NULL
    ORDER BY sub.g_id, sub.cnt DESC
  ),
  no_show_stats AS (
    SELECT
      CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      COUNT(*)::bigint AS no_shows
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND r.status = 'no_show'
    GROUP BY CASE
      WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
      ELSE name_match.id
    END
  ),
  cancellation_stats AS (
    SELECT
      CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      COUNT(*)::bigint AS cancellations
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND r.status = 'cancelled'
    GROUP BY CASE
      WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
      ELSE name_match.id
    END
  ),
  reservation_count AS (
    SELECT
      CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      COUNT(*)::bigint AS total_res
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
    GROUP BY CASE
      WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
      ELSE name_match.id
    END
  ),
  party_stats AS (
    SELECT
      CASE
        WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
        ELSE name_match.id
      END AS g_id,
      AVG(COALESCE(r.party_size, 1))::numeric AS avg_party
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = r.user_id
        AND r.user_id IS NOT NULL
      LIMIT 1
    ) user_match ON TRUE
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND r.status IN ('accepted', 'completed')
    GROUP BY CASE
      WHEN r.user_id IS NOT NULL THEN COALESCE(user_match.id, name_match.id)
      ELSE name_match.id
    END
  )
  SELECT
    cg.id AS guest_id,
    COALESCE(vs.total_visits, 0) AS total_visits,
    COALESCE(ts.spend_cents, 0) AS total_spend_cents,
    COALESCE(ns.no_shows, 0) AS total_no_shows,
    COALESCE(cs.cancellations, 0) AS total_cancellations,
    vs.first_visit,
    vs.last_visit,
    COALESCE(ps.avg_party, 0) AS avg_party_size,
    ft.fav AS favorite_table,
    COALESCE(rc.total_res, 0) AS total_reservations
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
