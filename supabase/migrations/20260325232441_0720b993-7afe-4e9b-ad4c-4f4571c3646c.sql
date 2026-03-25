-- Helper: resolve ticket rows to the correct CRM guest (per-person, not per-booker)
CREATE OR REPLACE FUNCTION public.resolve_crm_guest_for_ticket(
  p_business_id uuid,
  p_user_id uuid,
  p_guest_name text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name_key text;
  v_profile_name text;
  v_profile_full_name text;
  v_user_guest_id uuid;
  v_name_guest_id uuid;
BEGIN
  IF p_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_name_key := public.normalize_guest_identity(NULLIF(trim(COALESCE(p_guest_name, '')), ''));

  IF p_user_id IS NOT NULL THEN
    SELECT p.name, concat_ws(' ', p.first_name, p.last_name)
    INTO v_profile_name, v_profile_full_name
    FROM public.profiles p
    WHERE p.id = p_user_id;

    SELECT cg.id
    INTO v_user_guest_id
    FROM public.crm_guests cg
    WHERE cg.business_id = p_business_id
      AND cg.user_id = p_user_id
    LIMIT 1;
  END IF;

  -- If ticket name matches account profile name, force account-based CRM identity
  IF p_user_id IS NOT NULL
     AND v_name_key IS NOT NULL
     AND (
       v_name_key = public.normalize_guest_identity(v_profile_name)
       OR v_name_key = public.normalize_guest_identity(v_profile_full_name)
     )
     AND v_user_guest_id IS NOT NULL THEN
    RETURN v_user_guest_id;
  END IF;

  -- Otherwise prefer direct name match (ghost/person-level attribution)
  IF v_name_key IS NOT NULL THEN
    SELECT cg.id
    INTO v_name_guest_id
    FROM public.crm_guests cg
    WHERE cg.business_id = p_business_id
      AND public.normalize_guest_identity(cg.guest_name) = v_name_key
    ORDER BY CASE WHEN cg.user_id IS NULL THEN 0 ELSE 1 END, cg.created_at ASC
    LIMIT 1;

    IF v_name_guest_id IS NOT NULL THEN
      RETURN v_name_guest_id;
    END IF;
  END IF;

  RETURN v_user_guest_id;
END;
$$;

-- Core ticket->CRM sync logic with ghost origin tracking
CREATE OR REPLACE FUNCTION public.sync_crm_guest_from_ticket_data_core(
  p_business_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_guest_name text,
  p_ticket_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_name text;
  v_order_email text;
  v_order_phone text;
  v_profile_name text;
  v_profile_full_name text;
  v_profile_email text;
  v_effective_user_id uuid;
  v_name_matches_profile boolean;
  v_guest_id uuid;
BEGIN
  IF p_business_id IS NULL OR p_ticket_status = 'cancelled' THEN
    RETURN;
  END IF;

  v_guest_name := NULLIF(trim(COALESCE(p_guest_name, '')), '');

  IF p_order_id IS NOT NULL THEN
    SELECT o.customer_email, o.customer_phone
    INTO v_order_email, v_order_phone
    FROM public.ticket_orders o
    WHERE o.id = p_order_id;
  END IF;

  v_effective_user_id := NULL;

  IF p_user_id IS NOT NULL THEN
    SELECT p.name,
           concat_ws(' ', p.first_name, p.last_name),
           p.email
    INTO v_profile_name, v_profile_full_name, v_profile_email
    FROM public.profiles p
    WHERE p.id = p_user_id;

    v_name_matches_profile := (
      v_guest_name IS NULL
      OR public.normalize_guest_identity(v_guest_name) = public.normalize_guest_identity(v_profile_name)
      OR public.normalize_guest_identity(v_guest_name) = public.normalize_guest_identity(v_profile_full_name)
    );

    IF v_name_matches_profile THEN
      v_effective_user_id := p_user_id;
      v_guest_name := COALESCE(NULLIF(trim(v_profile_full_name), ''), NULLIF(trim(v_profile_name), ''), v_guest_name);
    END IF;
  END IF;

  IF v_effective_user_id IS NOT NULL THEN
    v_guest_id := public.upsert_crm_guest_identity(
      p_business_id,
      v_effective_user_id,
      v_guest_name,
      v_order_phone,
      COALESCE(v_profile_email, v_order_email),
      'registered'
    );
  ELSE
    v_guest_id := public.upsert_crm_guest_identity(
      p_business_id,
      NULL,
      COALESCE(v_guest_name, 'Guest'),
      NULL,
      NULL,
      'ghost'
    );

    -- Keep transparent origin for ghosts: who brought this person
    IF v_guest_id IS NOT NULL AND p_user_id IS NOT NULL THEN
      UPDATE public.crm_guests cg
      SET brought_by_user_id = COALESCE(cg.brought_by_user_id, p_user_id),
          updated_at = now()
      WHERE cg.id = v_guest_id
        AND cg.user_id IS NULL;
    END IF;
  END IF;
END;
$$;

-- Keep both public overloads for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_crm_guest_from_ticket_data(
  p_business_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_guest_name text,
  p_ticket_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_crm_guest_from_ticket_data_core(
    p_business_id,
    p_user_id,
    p_order_id,
    p_guest_name,
    p_ticket_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_crm_guest_from_ticket_data(
  p_business_id uuid,
  p_user_id uuid,
  p_guest_name text,
  p_order_id uuid,
  p_ticket_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_crm_guest_from_ticket_data_core(
    p_business_id,
    p_user_id,
    p_order_id,
    p_guest_name,
    p_ticket_status
  );
END;
$$;

-- Main CRM stats function: strict per-person visits/no-shows + spend split policy
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
  ),

  booker_direct_visits AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      r.checked_in_at AS visited_at,
      NULL::uuid AS visit_event_id
    FROM public.reservations r
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(r.phone_number, '')), ''), '')
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
      op.redeemed_at AS visited_at,
      NULL::uuid AS visit_event_id
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(op.guest_name) IS NOT NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(op.guest_name)
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
        AND op.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE d.business_id = p_business_id
      AND op.redeemed_at IS NOT NULL
  ),

  student_visits AS (
    SELECT um.id AS g_id, sdr.created_at AS visited_at, NULL::uuid AS visit_event_id
    FROM public.student_discount_redemptions sdr
    JOIN public.student_verifications sv ON sv.id = sdr.student_verification_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = sv.user_id
      LIMIT 1
    ) um ON TRUE
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
    SELECT g_id, MIN(visited_at) AS visited_at, visit_event_id
    FROM raw_visits
    WHERE visit_event_id IS NOT NULL
    GROUP BY g_id, visit_event_id

    UNION ALL

    SELECT g_id, visited_at, visit_event_id
    FROM raw_visits
    WHERE visit_event_id IS NULL
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
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
    WHERE t.status::text IN ('valid', 'used')
    GROUP BY public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name)
  ),

  reservation_spend_base AS (
    SELECT
      r.id AS reservation_id,
      GREATEST(COALESCE(r.party_size, 1), 1) AS party_size,
      CASE
        WHEN COALESCE(r.actual_spend_cents, 0) > 0 THEN r.actual_spend_cents
        WHEN r.event_id IS NOT NULL AND e.end_at <= now() THEN COALESCE(r.prepaid_min_charge_cents, r.ticket_credit_cents, 0)
        WHEN r.event_id IS NULL THEN COALESCE(r.prepaid_min_charge_cents, r.ticket_credit_cents, 0)
        ELSE 0
      END AS total_spend_cents,
      r.user_id,
      r.reservation_name,
      r.phone_number
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),

  reservation_main_participant AS (
    SELECT
      rsb.reservation_id,
      CASE WHEN rsb.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id
    FROM reservation_spend_base rsb
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rsb.reservation_name)
        AND COALESCE(NULLIF(trim(COALESCE(cg.phone, '')), ''), '') = COALESCE(NULLIF(trim(COALESCE(rsb.phone_number, '')), ''), '')
      LIMIT 1
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = rsb.user_id
        AND rsb.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
  ),

  reservation_guest_participants AS (
    SELECT rsb.reservation_id, nm.id AS g_id
    FROM reservation_spend_base rsb
    JOIN public.reservation_guests rg ON rg.reservation_id = rsb.reservation_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
      LIMIT 1
    ) nm ON TRUE
    WHERE nm.id IS NOT NULL
  ),

  reservation_ticket_participants AS (
    SELECT rsb.reservation_id, x.g_id
    FROM reservation_spend_base rsb
    JOIN public.ticket_orders o ON o.linked_reservation_id = rsb.reservation_id
    JOIN public.tickets t ON t.order_id = o.id
    CROSS JOIN LATERAL (
      SELECT public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id
    ) x
    WHERE x.g_id IS NOT NULL
  ),

  reservation_participants AS (
    SELECT DISTINCT reservation_id, g_id
    FROM (
      SELECT reservation_id, g_id FROM reservation_main_participant WHERE g_id IS NOT NULL
      UNION ALL
      SELECT reservation_id, g_id FROM reservation_guest_participants WHERE g_id IS NOT NULL
      UNION ALL
      SELECT reservation_id, g_id FROM reservation_ticket_participants WHERE g_id IS NOT NULL
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
      CASE WHEN op.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
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
    ) nm ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
        AND op.user_id IS NOT NULL
      LIMIT 1
    ) um ON TRUE
    WHERE d.business_id = p_business_id
      AND op.status = 'paid'
    GROUP BY CASE WHEN op.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  total_spend AS (
    SELECT g_id, SUM(spend_cents)::bigint AS spend_cents
    FROM (
      SELECT g_id, spend_cents FROM ticket_spend WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, spend_cents FROM reservation_spend WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, spend_cents FROM offer_spend WHERE g_id IS NOT NULL
    ) s
    GROUP BY g_id
  ),

  ticket_no_show_candidates AS (
    SELECT
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      t.event_id,
      BOOL_OR(t.checked_in_at IS NOT NULL) AS has_checkin
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    WHERE COALESCE(t.status::text, '') <> 'cancelled'
    GROUP BY public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name), t.event_id
  ),

  ticket_no_shows AS (
    SELECT c.g_id, COUNT(*)::bigint AS no_shows
    FROM ticket_no_show_candidates c
    JOIN business_events be ON be.id = c.event_id
    WHERE c.g_id IS NOT NULL
      AND be.end_at < now()
      AND c.has_checkin = FALSE
    GROUP BY c.g_id
  ),

  event_guest_no_shows AS (
    SELECT nm.id AS g_id, COUNT(*)::bigint AS no_shows
    FROM public.reservation_guests rg
    JOIN public.reservations r ON r.id = rg.reservation_id
    JOIN public.events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
      LIMIT 1
    ) nm ON TRUE
    WHERE e.business_id = p_business_id
      AND r.status = 'accepted'
      AND e.end_at < now()
      AND rg.checked_in_at IS NULL
      AND nm.id IS NOT NULL
    GROUP BY nm.id
  ),

  event_booker_no_shows AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS no_shows
    FROM public.reservations r
    JOIN public.events e ON e.id = r.event_id
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
    WHERE e.business_id = p_business_id
      AND r.status = 'accepted'
      AND e.end_at < now()
      AND r.checked_in_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.ticket_orders o WHERE o.linked_reservation_id = r.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.tickets t
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
      AND r.status = 'no_show'
      AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  no_show_stats AS (
    SELECT g_id, SUM(no_shows)::bigint AS no_shows
    FROM (
      SELECT g_id, no_shows FROM ticket_no_shows
      UNION ALL SELECT g_id, no_shows FROM event_guest_no_shows
      UNION ALL SELECT g_id, no_shows FROM event_booker_no_shows WHERE g_id IS NOT NULL
      UNION ALL SELECT g_id, no_shows FROM legacy_no_shows WHERE g_id IS NOT NULL
    ) ns
    GROUP BY g_id
  ),

  cancellation_stats AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS cancellations
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

  fav_table AS (
    SELECT DISTINCT ON (sub.g_id) sub.g_id, sub.tbl_label AS fav
    FROM (
      SELECT nm.id AS g_id, fpt.label AS tbl_label, COUNT(*) AS cnt
      FROM public.reservation_guests rg
      JOIN public.reservations r ON r.id = rg.reservation_id
      LEFT JOIN public.events e ON e.id = r.event_id
      JOIN public.reservation_table_assignments rta ON r.id = rta.reservation_id
      JOIN public.floor_plan_tables fpt ON rta.table_id = fpt.id
      LEFT JOIN LATERAL (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(rg.guest_name)
        LIMIT 1
      ) nm ON TRUE
      WHERE rg.checked_in_at IS NOT NULL
        AND nm.id IS NOT NULL
        AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      GROUP BY nm.id, fpt.label

      UNION ALL

      SELECT
        CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
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
        AND NOT EXISTS (SELECT 1 FROM public.reservation_guests rg WHERE rg.reservation_id = r.id)
        AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END, fpt.label
    ) sub
    WHERE sub.g_id IS NOT NULL
    ORDER BY sub.g_id, sub.cnt DESC
  ),

  reservation_count AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      COUNT(*)::bigint AS total_res
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
    GROUP BY CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END
  ),

  party_stats AS (
    SELECT
      CASE WHEN r.user_id IS NOT NULL THEN COALESCE(um.id, nm.id) ELSE nm.id END AS g_id,
      AVG(COALESCE(r.party_size, 1))::numeric AS avg_party
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
    COALESCE(vs.total_visits, 0),
    COALESCE(ts.spend_cents, 0),
    COALESCE(ns.no_shows, 0),
    COALESCE(cs.cancellations, 0),
    vs.first_visit,
    vs.last_visit,
    COALESCE(ps.avg_party, 0),
    ft.fav,
    COALESCE(rc.total_res, 0)
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

-- Backfill origin for existing ghosts from ticket-linked reservations
WITH origin_candidates AS (
  SELECT DISTINCT ON (cg.id)
    cg.id AS ghost_id,
    r.user_id AS brought_by_user_id,
    t.created_at
  FROM public.crm_guests cg
  JOIN public.tickets t
    ON public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name)
  JOIN public.ticket_orders o ON o.id = t.order_id
  JOIN public.reservations r ON r.id = o.linked_reservation_id
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE cg.profile_type = 'ghost'
    AND cg.user_id IS NULL
    AND cg.brought_by_user_id IS NULL
    AND r.user_id IS NOT NULL
    AND (
      (r.business_id IS NOT NULL AND r.business_id = cg.business_id)
      OR (e.business_id IS NOT NULL AND e.business_id = cg.business_id)
    )
  ORDER BY cg.id, t.created_at DESC
)
UPDATE public.crm_guests cg
SET brought_by_user_id = oc.brought_by_user_id,
    updated_at = now()
FROM origin_candidates oc
WHERE cg.id = oc.ghost_id;