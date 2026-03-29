CREATE OR REPLACE FUNCTION public.get_crm_guest_stats_v2(p_business_id uuid)
RETURNS TABLE(
  guest_id uuid,
  total_visits bigint,
  total_spend_cents bigint,
  total_no_shows bigint,
  total_cancellations bigint,
  first_visit timestamp with time zone,
  last_visit timestamp with time zone,
  avg_party_size numeric,
  favorite_table text,
  total_reservations bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT * FROM public.get_crm_guest_stats(p_business_id)
),
standalone_ticket_source AS (
  SELECT
    t.id AS ticket_id,
    CASE WHEN t.is_manual_entry THEN NULL ELSE t.user_id END AS buyer_id,
    NULLIF(trim(COALESCE(t.guest_name, '')), '') AS guest_name_exact,
    t.created_at,
    COALESCE(tt.price_cents, 0)::bigint AS price_cents
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
  WHERE e.business_id = p_business_id
    AND COALESCE(t.status::text, '') IN ('valid', 'used')
    AND NOT EXISTS (
      SELECT 1
      FROM public.ticket_orders tord
      WHERE tord.id = t.order_id
        AND tord.linked_reservation_id IS NOT NULL
    )
),
old_ticket_spend AS (
  SELECT
    public.resolve_crm_guest_for_ticket(
      p_business_id,
      sts.buyer_id,
      sts.guest_name_exact
    ) AS g_id,
    SUM(sts.price_cents)::bigint AS spend_cents
  FROM standalone_ticket_source sts
  GROUP BY 1
),
ticket_indexed AS (
  SELECT
    sts.ticket_id,
    sts.buyer_id,
    sts.guest_name_exact,
    row_number() OVER (
      PARTITION BY sts.buyer_id, sts.guest_name_exact
      ORDER BY sts.created_at, sts.ticket_id
    ) AS seq_no
  FROM standalone_ticket_source sts
  WHERE sts.guest_name_exact IS NOT NULL
),
ghost_indexed AS (
  SELECT
    cg.id AS g_id,
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
new_ticket_guest_map AS (
  SELECT
    sts.ticket_id,
    COALESCE(
      gi.g_id,
      public.resolve_crm_guest_for_ticket(
        p_business_id,
        sts.buyer_id,
        sts.guest_name_exact
      )
    ) AS g_id,
    sts.price_cents
  FROM standalone_ticket_source sts
  LEFT JOIN ticket_indexed ti ON ti.ticket_id = sts.ticket_id
  LEFT JOIN ghost_indexed gi
    ON gi.buyer_id IS NOT DISTINCT FROM ti.buyer_id
   AND gi.guest_name_exact = ti.guest_name_exact
   AND gi.seq_no = ti.seq_no
),
new_ticket_spend AS (
  SELECT g_id, SUM(price_cents)::bigint AS spend_cents
  FROM new_ticket_guest_map
  WHERE g_id IS NOT NULL
  GROUP BY g_id
)
SELECT
  b.guest_id,
  b.total_visits,
  CASE
    WHEN cg.spend_override_cents IS NOT NULL THEN b.total_spend_cents
    ELSE GREATEST(
      0,
      b.total_spend_cents
      - COALESCE(ots.spend_cents, 0)
      + COALESCE(nts.spend_cents, 0)
    )::bigint
  END AS total_spend_cents,
  b.total_no_shows,
  b.total_cancellations,
  b.first_visit,
  b.last_visit,
  b.avg_party_size,
  b.favorite_table,
  b.total_reservations
FROM base b
LEFT JOIN public.crm_guests cg ON cg.id = b.guest_id
LEFT JOIN old_ticket_spend ots ON ots.g_id = b.guest_id
LEFT JOIN new_ticket_spend nts ON nts.g_id = b.guest_id;
$function$;