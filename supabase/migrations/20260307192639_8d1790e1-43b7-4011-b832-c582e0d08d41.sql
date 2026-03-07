CREATE OR REPLACE FUNCTION public.get_event_walk_in_ticket_sold_counts(p_event_ids uuid[])
RETURNS TABLE (
  event_id uuid,
  tier_id uuid,
  tickets_sold bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tt.event_id,
    tt.id AS tier_id,
    COALESCE(
      COUNT(t.id) FILTER (
        WHERE t.status IN ('valid', 'used')
          AND (
            tt.quantity_total <= 0
            OR tt.quantity_total = 999999
            OR o.id IS NULL
            OR o.linked_reservation_id IS NULL
            OR (lr.auto_created_from_tickets = true AND lr.seating_type_id IS NULL)
          )
      ),
      0
    )::bigint AS tickets_sold
  FROM public.ticket_tiers tt
  LEFT JOIN public.tickets t ON t.tier_id = tt.id
  LEFT JOIN public.ticket_orders o ON o.id = t.order_id
  LEFT JOIN public.reservations lr ON lr.id = o.linked_reservation_id
  WHERE tt.event_id = ANY (p_event_ids)
  GROUP BY tt.event_id, tt.id, tt.quantity_total
$$;

GRANT EXECUTE ON FUNCTION public.get_event_walk_in_ticket_sold_counts(uuid[]) TO anon, authenticated;