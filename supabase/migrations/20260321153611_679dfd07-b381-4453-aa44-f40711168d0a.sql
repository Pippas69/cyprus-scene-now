
-- Fix get_crm_guest_stats to properly filter reservations by business
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
  WITH guest_reservations AS (
    SELECT 
      cg.id AS g_id,
      r.status,
      r.party_size,
      r.created_at AS r_created
    FROM crm_guests cg
    JOIN reservations r ON (
      (cg.user_id IS NOT NULL AND r.user_id = cg.user_id)
      OR (cg.user_id IS NULL AND r.reservation_name = cg.guest_name AND COALESCE(r.phone_number,'') = COALESCE(cg.phone,''))
    )
    LEFT JOIN events e ON r.event_id = e.id
    WHERE cg.business_id = p_business_id
      AND (
        (r.event_id IS NOT NULL AND e.business_id = p_business_id)
        OR (r.event_id IS NULL AND r.business_id = p_business_id)
      )
  ),
  visit_stats AS (
    SELECT 
      g_id,
      COUNT(*) FILTER (WHERE status = 'accepted') AS v_visits,
      COUNT(*) FILTER (WHERE status = 'declined') AS v_noshows,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS v_cancels,
      COUNT(*) AS v_total,
      AVG(party_size) FILTER (WHERE status = 'accepted') AS v_party,
      MIN(r_created) FILTER (WHERE status = 'accepted') AS v_first,
      MAX(r_created) FILTER (WHERE status = 'accepted') AS v_last
    FROM guest_reservations
    GROUP BY g_id
  ),
  ticket_spend AS (
    SELECT 
      cg.id AS g_id,
      COALESCE(SUM(tor.total_cents), 0) AS spend
    FROM crm_guests cg
    JOIN ticket_orders tor ON cg.user_id = tor.user_id AND tor.business_id = p_business_id
    WHERE cg.user_id IS NOT NULL
      AND cg.business_id = p_business_id
      AND tor.status = 'completed'
    GROUP BY cg.id
  ),
  fav_table AS (
    SELECT DISTINCT ON (sub.g_id) sub.g_id, sub.tbl_label AS fav
    FROM (
      SELECT cg.id AS g_id, fpt.label AS tbl_label, COUNT(*) AS cnt
      FROM crm_guests cg
      JOIN reservations r ON cg.user_id IS NOT NULL AND r.user_id = cg.user_id
        AND (r.business_id = p_business_id OR r.event_id IN (SELECT id FROM events WHERE business_id = p_business_id))
      JOIN reservation_table_assignments rta ON r.id = rta.reservation_id
      JOIN floor_plan_tables fpt ON rta.table_id = fpt.id
      WHERE fpt.business_id = p_business_id AND cg.business_id = p_business_id
      GROUP BY cg.id, fpt.label
    ) sub
    ORDER BY sub.g_id, sub.cnt DESC
  )
  SELECT
    cg.id,
    COALESCE(vs.v_visits, 0)::BIGINT,
    COALESCE(ts.spend, 0)::BIGINT,
    COALESCE(vs.v_noshows, 0)::BIGINT,
    COALESCE(vs.v_cancels, 0)::BIGINT,
    vs.v_first,
    vs.v_last,
    ROUND(COALESCE(vs.v_party, 0), 1),
    ft.fav,
    COALESCE(vs.v_total, 0)::BIGINT
  FROM crm_guests cg
  LEFT JOIN visit_stats vs ON cg.id = vs.g_id
  LEFT JOIN ticket_spend ts ON cg.id = ts.g_id
  LEFT JOIN fav_table ft ON cg.id = ft.g_id
  WHERE cg.business_id = p_business_id;
END;
$$;
