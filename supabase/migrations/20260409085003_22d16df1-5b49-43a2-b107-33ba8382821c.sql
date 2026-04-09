
CREATE OR REPLACE FUNCTION public.get_crm_guest_timeline(p_business_id uuid, p_guest_id uuid)
RETURNS TABLE (
  activity_type text,
  title text,
  activity_date timestamptz,
  booked_at timestamptz,
  checked_in_at timestamptz,
  spend_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH guest_info AS (
    SELECT cg.user_id, cg.guest_name, cg.brought_by_user_id, cg.profile_type
    FROM crm_guests cg
    WHERE cg.id = p_guest_id AND cg.business_id = p_business_id
    LIMIT 1
  ),
  -- IDs of reservations linked to ticket orders (hybrid) — to exclude from reservation CTEs
  hybrid_reservation_ids AS (
    SELECT DISTINCT tord.linked_reservation_id AS id
    FROM ticket_orders tord
    WHERE tord.linked_reservation_id IS NOT NULL
  ),
  -- 1. Ticket activities
  ticket_activities AS (
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM reservations r2 WHERE r2.id = tord.linked_reservation_id)
        THEN 'hybrid'::text
        ELSE 'ticket'::text
      END AS activity_type,
      e.title,
      COALESCE(e.start_at, e.created_at) AS activity_date,
      COALESCE(tord.created_at, t.created_at) AS booked_at,
      t.checked_in_at,
      COALESCE(
        tord.subtotal_cents / GREATEST(
          (SELECT COUNT(*) FROM tickets t2 WHERE t2.order_id = t.order_id AND COALESCE(t2.status::text,'') <> 'cancelled'), 1
        ),
        COALESCE(tt.price_cents, 0)
      )::bigint AS spend_cents
    FROM tickets t
    JOIN events e ON e.id = t.event_id AND e.business_id = p_business_id
    LEFT JOIN ticket_orders tord ON tord.id = t.order_id AND tord.status = 'completed'
    LEFT JOIN ticket_tiers tt ON tt.id = t.tier_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(t.status::text, '') <> 'cancelled'
      AND (
        (gi.user_id IS NOT NULL AND t.user_id = gi.user_id AND COALESCE(t.is_manual_entry, false) = false
         AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (gi.brought_by_user_id IS NOT NULL AND t.user_id = gi.brought_by_user_id
            AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (gi.user_id IS NULL AND gi.brought_by_user_id IS NULL
            AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (COALESCE(t.is_manual_entry, false) = true
            AND lower(trim(COALESCE(t.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
      )
  ),
  -- 2. Reservation booker (exclude hybrid-linked reservations)
  reservation_booker AS (
    SELECT
      CASE
        WHEN r.source = 'walk_in' AND r.event_id IS NOT NULL THEN 'walk_in_event'::text
        WHEN r.source = 'walk_in' THEN 'walk_in'::text
        WHEN r.event_id IS NOT NULL THEN 'reservation_event'::text
        WHEN op.id IS NOT NULL THEN 'offer'::text
        ELSE 'reservation_profile'::text
      END AS activity_type,
      COALESCE(e.title, d.title, b.name, 'Κράτηση') AS title,
      COALESCE(e.start_at, r.preferred_time, r.created_at) AS activity_date,
      r.created_at AS booked_at,
      r.checked_in_at,
      CASE
        WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0
          THEN (r.actual_spend_cents / GREATEST(r.party_size, 1))::bigint
        WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0
          THEN (r.prepaid_min_charge_cents / GREATEST(r.party_size, 1))::bigint
        ELSE 0::bigint
      END AS spend_cents
    FROM reservations r
    LEFT JOIN events e ON e.id = r.event_id
    LEFT JOIN businesses b ON b.id = r.business_id
    LEFT JOIN offer_purchases op ON op.reservation_id = r.id
    LEFT JOIN discounts d ON d.id = op.discount_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(r.auto_created_from_tickets, false) = false
      AND r.id NOT IN (SELECT hri.id FROM hybrid_reservation_ids hri)
      AND r.source IS DISTINCT FROM 'ticket_auto'
      AND r.status IN ('accepted', 'completed', 'pending', 'no_show')
      AND ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND (
        (gi.user_id IS NOT NULL AND r.user_id = gi.user_id)
        OR (r.is_manual_entry = true AND lower(trim(COALESCE(r.reservation_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
        OR (gi.user_id IS NULL AND gi.brought_by_user_id IS NULL
            AND lower(trim(COALESCE(r.reservation_name,''))) = lower(trim(COALESCE(gi.guest_name,''))))
      )
  ),
  -- Ghost in reservation events (exclude hybrid-linked)
  reservation_ghost_event AS (
    SELECT
      CASE
        WHEN r.source = 'walk_in' THEN 'walk_in_event'::text
        ELSE 'reservation_event'::text
      END AS activity_type,
      COALESCE(e.title, 'Κράτηση') AS title,
      COALESCE(e.start_at, r.preferred_time, r.created_at) AS activity_date,
      r.created_at AS booked_at,
      COALESCE(rg.checked_in_at, r.checked_in_at) AS checked_in_at,
      CASE
        WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0
          THEN (r.actual_spend_cents / GREATEST(r.party_size, 1))::bigint
        WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0
          THEN (r.prepaid_min_charge_cents / GREATEST(r.party_size, 1))::bigint
        ELSE 0::bigint
      END AS spend_cents
    FROM reservation_guests rg
    JOIN reservations r ON r.id = rg.reservation_id
    LEFT JOIN events e ON e.id = r.event_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(r.auto_created_from_tickets, false) = false
      AND r.id NOT IN (SELECT hri.id FROM hybrid_reservation_ids hri)
      AND r.source IS DISTINCT FROM 'ticket_auto'
      AND r.status IN ('accepted', 'completed', 'pending', 'no_show')
      AND r.event_id IS NOT NULL
      AND e.business_id = p_business_id
      AND gi.brought_by_user_id IS NOT NULL
      AND r.user_id = gi.brought_by_user_id
      AND lower(trim(COALESCE(rg.guest_name,''))) = lower(trim(COALESCE(gi.guest_name,'')))
  ),
  -- Ghost in profile/offer reservations
  reservation_ghost_profile AS (
    SELECT
      CASE
        WHEN r.source = 'walk_in' THEN 'walk_in'::text
        WHEN op.id IS NOT NULL THEN 'offer'::text
        ELSE 'reservation_profile'::text
      END AS activity_type,
      COALESCE(d.title, b.name, 'Κράτηση') AS title,
      COALESCE(r.preferred_time, r.created_at) AS activity_date,
      r.created_at AS booked_at,
      r.checked_in_at,
      CASE
        WHEN r.actual_spend_cents IS NOT NULL AND r.actual_spend_cents > 0
          THEN (r.actual_spend_cents / GREATEST(r.party_size, 1))::bigint
        WHEN r.prepaid_min_charge_cents IS NOT NULL AND r.prepaid_min_charge_cents > 0
          THEN (r.prepaid_min_charge_cents / GREATEST(r.party_size, 1))::bigint
        ELSE 0::bigint
      END AS spend_cents
    FROM reservations r
    LEFT JOIN businesses b ON b.id = r.business_id
    LEFT JOIN offer_purchases op ON op.reservation_id = r.id
    LEFT JOIN discounts d ON d.id = op.discount_id
    CROSS JOIN guest_info gi
    WHERE COALESCE(r.auto_created_from_tickets, false) = false
      AND r.event_id IS NULL
      AND r.business_id = p_business_id
      AND gi.brought_by_user_id IS NOT NULL
      AND r.user_id = gi.brought_by_user_id
  )
  SELECT * FROM ticket_activities
  UNION ALL
  SELECT * FROM reservation_booker
  UNION ALL
  SELECT * FROM reservation_ghost_event
  UNION ALL
  SELECT * FROM reservation_ghost_profile
  ORDER BY activity_date DESC;
$$;
