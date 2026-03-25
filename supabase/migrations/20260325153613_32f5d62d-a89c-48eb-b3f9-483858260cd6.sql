-- Fix CRM ticket attribution + linked reservation double-counting across analytics

-- Remove accidental overloaded variant that is not used by ticket trigger
DROP FUNCTION IF EXISTS public.sync_crm_guest_from_ticket_data(uuid, uuid, text, uuid, text);

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
    LEFT JOIN public.profiles tp ON tp.id = t.user_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = t.user_id
        AND (
          public.normalize_guest_identity(t.guest_name) IS NULL
          OR public.normalize_guest_identity(t.guest_name) = public.normalize_guest_identity(tp.first_name)
          OR public.normalize_guest_identity(t.guest_name) = public.normalize_guest_identity(concat_ws(' ', tp.first_name, tp.last_name))
          OR public.normalize_guest_identity(t.guest_name) = public.normalize_guest_identity(tp.name)
        )
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name)
      LIMIT 1
    ) name_match ON public.normalize_guest_identity(t.guest_name) IS NOT NULL
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
    ) name_match ON TRUE
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
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
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
      user_match.id AS g_id,
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
    ) name_match ON TRUE
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
    LEFT JOIN public.profiles tp ON tp.id = t.user_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = t.user_id
        AND (
          public.normalize_guest_identity(t.guest_name) IS NULL
          OR public.normalize_guest_identity(t.guest_name) = public.normalize_guest_identity(tp.first_name)
          OR public.normalize_guest_identity(t.guest_name) = public.normalize_guest_identity(concat_ws(' ', tp.first_name, tp.last_name))
          OR public.normalize_guest_identity(t.guest_name) = public.normalize_guest_identity(tp.name)
        )
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(t.guest_name)
      LIMIT 1
    ) name_match ON public.normalize_guest_identity(t.guest_name) IS NOT NULL
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
      LIMIT 1
    ) user_match ON TRUE
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id IS NULL
        AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
      LIMIT 1
    ) name_match ON TRUE
    WHERE (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (r.event_id IS NOT NULL AND e.business_id = p_business_id)
    )
      AND r.status = 'accepted'
    GROUP BY COALESCE(user_match.id, name_match.id)
  ),
  offer_spend AS (
    SELECT
      user_match.id AS g_id,
      SUM(COALESCE(op.final_price_cents, 0))::bigint AS spend_cents
    FROM public.offer_purchases op
    JOIN public.discounts d ON d.id = op.discount_id
    LEFT JOIN LATERAL (
      SELECT cg.id
      FROM public.crm_guests cg
      WHERE cg.business_id = p_business_id
        AND cg.user_id = op.user_id
      LIMIT 1
    ) user_match ON TRUE
    WHERE d.business_id = p_business_id
      AND op.status = 'paid'
    GROUP BY user_match.id
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
        LIMIT 1
      ) user_match ON TRUE
      LEFT JOIN LATERAL (
        SELECT cg.id
        FROM public.crm_guests cg
        WHERE cg.business_id = p_business_id
          AND cg.user_id IS NULL
          AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(r.reservation_name)
        LIMIT 1
      ) name_match ON TRUE
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

DROP FUNCTION IF EXISTS public.get_audience_demographics(uuid, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_audience_demographics(
  p_business_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id AND user_id = v_user_id
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: You do not own this business';
    END IF;
  END IF;

  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '1 year');
  v_end_date := COALESCE(p_end_date, NOW());

  WITH raw_visits AS (
    SELECT t.user_id, t.event_id AS visit_event_id
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.business_id = p_business_id
      AND t.checked_in_at IS NOT NULL
      AND t.checked_in_at >= v_start_date
      AND t.checked_in_at <= v_end_date

    UNION ALL

    SELECT op.user_id, NULL::uuid AS visit_event_id
    FROM offer_purchases op
    WHERE op.business_id = p_business_id
      AND op.redeemed_at IS NOT NULL
      AND op.redeemed_at >= v_start_date
      AND op.redeemed_at <= v_end_date

    UNION ALL

    SELECT r.user_id, r.event_id AS visit_event_id
    FROM reservations r
    LEFT JOIN events e ON r.event_id = e.id
    WHERE (r.business_id = p_business_id OR e.business_id = p_business_id)
      AND r.checked_in_at IS NOT NULL
      AND r.checked_in_at >= v_start_date
      AND r.checked_in_at <= v_end_date
      AND NOT EXISTS (
        SELECT 1 FROM offer_purchases op2
        WHERE op2.reservation_id = r.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM ticket_orders tor
        WHERE tor.linked_reservation_id = r.id
      )
      AND NOT (LOWER(COALESCE(r.special_requests, '')) LIKE '%offer claim:%')
      AND COALESCE(r.auto_created_from_tickets, false) = false

    UNION ALL

    SELECT sv.user_id, NULL::uuid AS visit_event_id
    FROM student_discount_redemptions sdr
    JOIN student_verifications sv ON sdr.student_verification_id = sv.id
    WHERE sdr.business_id = p_business_id
      AND sdr.created_at >= v_start_date
      AND sdr.created_at <= v_end_date
  ),
  deduped_visits AS (
    SELECT DISTINCT ON (user_id, COALESCE(visit_event_id, gen_random_uuid()))
      user_id, 1 AS visit_count
    FROM raw_visits
    WHERE user_id IS NOT NULL
  ),
  user_visit_counts AS (
    SELECT user_id, SUM(visit_count) AS weight
    FROM deduped_visits
    GROUP BY user_id
  ),
  demographics AS (
    SELECT
      p.id,
      uvc.weight,
      p.gender,
      p.age,
      COALESCE(NULLIF(TRIM(p.city), ''), NULLIF(TRIM(p.town), '')) AS location
    FROM user_visit_counts uvc
    JOIN profiles p ON p.id = uvc.user_id
  ),
  gender_stats AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN LOWER(gender) IN ('male', 'm', 'άνδρας', 'αρσενικό') THEN weight
        ELSE 0
      END), 0) AS male,
      COALESCE(SUM(CASE
        WHEN LOWER(gender) IN ('female', 'f', 'γυναίκα', 'θηλυκό') THEN weight
        ELSE 0
      END), 0) AS female,
      COALESCE(SUM(CASE
        WHEN gender IS NULL OR LOWER(gender) NOT IN ('male', 'm', 'άνδρας', 'αρσενικό', 'female', 'f', 'γυναίκα', 'θηλυκό') THEN weight
        ELSE 0
      END), 0) AS other
    FROM demographics
  ),
  age_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN age >= 18 AND age <= 24 THEN weight ELSE 0 END), 0) AS "18-24",
      COALESCE(SUM(CASE WHEN age >= 25 AND age <= 34 THEN weight ELSE 0 END), 0) AS "25-34",
      COALESCE(SUM(CASE WHEN age >= 35 AND age <= 44 THEN weight ELSE 0 END), 0) AS "35-44",
      COALESCE(SUM(CASE WHEN age >= 45 THEN weight ELSE 0 END), 0) AS "45+"
    FROM demographics
  ),
  city_stats AS (
    SELECT COALESCE(json_object_agg(location, total_weight), '{}'::json) AS cities
    FROM (
      SELECT location, SUM(weight)::bigint AS total_weight
      FROM demographics
      WHERE location IS NOT NULL AND location <> ''
      GROUP BY location
      ORDER BY total_weight DESC
      LIMIT 6
    ) top_cities
  )
  SELECT json_build_object(
    'gender', json_build_object(
      'male', gs.male,
      'female', gs.female,
      'other', gs.other
    ),
    'age', json_build_object(
      '18-24', "18-24",
      '25-34', "25-34",
      '35-44', "35-44",
      '45+', "45+"
    ),
    'cities', cs.cities
  ) INTO v_result
  FROM gender_stats gs, age_stats, city_stats cs;

  RETURN COALESCE(v_result, json_build_object(
    'gender', json_build_object('male', 0, 'female', 0, 'other', 0),
    'age', json_build_object('18-24', 0, '25-34', 0, '35-44', 0, '45+', 0),
    'cities', '{}'::json
  ));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_audience_demographics TO authenticated, service_role;