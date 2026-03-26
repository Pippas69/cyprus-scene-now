DO $migration$
DECLARE
  fn_sql text;
  old_block text;
BEGIN
  SELECT pg_get_functiondef('public.get_crm_guest_stats(uuid)'::regprocedure)
  INTO fn_sql;

  old_block := $old_ticket$
  -- ======== SPEND: Ticket spend (unchanged - per ticket price) ========
  ticket_spend AS (
    SELECT
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
    WHERE t.status::text IN ('valid', 'used')
    GROUP BY public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name)
  ),$old_ticket$;

  IF position(old_block in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected ticket_spend block not found in get_crm_guest_stats';
  END IF;

  fn_sql := replace(
    fn_sql,
    old_block,
    $new_ticket$
  -- ======== SPEND: Ticket spend (exclude linked reservation tickets to avoid double count) ========
  ticket_spend AS (
    SELECT
      public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name) AS g_id,
      SUM(COALESCE(tt.price_cents, 0))::bigint AS spend_cents
    FROM public.tickets t
    JOIN business_events be ON be.id = t.event_id
    LEFT JOIN public.ticket_tiers tt ON tt.id = t.tier_id
    LEFT JOIN public.ticket_orders o ON o.id = t.order_id
    WHERE t.status::text IN ('valid', 'used')
      AND o.linked_reservation_id IS NULL
    GROUP BY public.resolve_crm_guest_for_ticket(p_business_id, t.user_id, t.guest_name)
  ),$new_ticket$
  );

  old_block := $old_base$
  -- ======== SPEND: Reservation spend with 3-phase logic ========
  reservation_spend_base AS (
    SELECT
      r.id AS reservation_id,
      GREATEST(COALESCE(r.party_size, 1), 1) AS party_size,
      -- target: the total amount that should be attributed (actual > min_charge > 0)
      CASE
        WHEN COALESCE(r.actual_spend_cents, 0) > 0 THEN r.actual_spend_cents
        WHEN r.event_id IS NOT NULL AND e.end_at <= now() THEN COALESCE(r.prepaid_min_charge_cents, r.ticket_credit_cents, 0)
        WHEN r.event_id IS NULL THEN COALESCE(r.prepaid_min_charge_cents, r.ticket_credit_cents, 0)
        ELSE 0
      END AS target_cents,
      -- prepayment: what was paid in-app upfront (part of min charge)
      COALESCE(r.ticket_credit_cents, r.prepaid_min_charge_cents, 0) AS prepayment_cents,
      r.user_id,
      r.reservation_name,
      r.phone_number
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),$old_base$;

  IF position(old_block in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected reservation_spend_base block not found in get_crm_guest_stats';
  END IF;

  fn_sql := replace(
    fn_sql,
    old_block,
    $new_base$
  -- ======== SPEND: Reservation spend with check-in aware logic ========
  reservation_spend_base AS (
    SELECT
      r.id AS reservation_id,
      GREATEST(COALESCE(r.party_size, 1), 1) AS party_size,
      -- target: actual spend if set, otherwise minimum charge (always known for event reservations)
      CASE
        WHEN COALESCE(r.actual_spend_cents, 0) > 0 THEN r.actual_spend_cents
        ELSE COALESCE(r.prepaid_min_charge_cents, r.ticket_credit_cents, 0)
      END AS target_cents,
      -- prepayment: what was paid in-app upfront (part of min charge)
      COALESCE(r.ticket_credit_cents, r.prepaid_min_charge_cents, 0) AS prepayment_cents,
      r.event_id,
      e.end_at AS event_end_at,
      r.user_id,
      r.reservation_name,
      r.phone_number
    FROM public.reservations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),$new_base$
  );

  old_block := $old_case$
  -- 3-phase spend calculation per participant
  reservation_spend AS (
    SELECT
      rpe.g_id,
      SUM(
        CASE
          -- Phase 1: No target yet (event not ended, no actual spend) → prepayment / party_size
          WHEN rsb.target_cents = 0 THEN
            ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)

          -- No-show: locked at prepayment / party_size
          WHEN NOT rpe.is_checked_in THEN
            ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)

          -- Checked-in with 0 total checked-in (safety): prepayment / party_size
          WHEN COALESCE(rcc.checked_in_count, 0) = 0 THEN
            ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)

          -- Checked-in: (target - no_show_prepayments) / checked_in_count
          ELSE
            ROUND(
              (
                rsb.target_cents::numeric
                - (rsb.party_size - rcc.checked_in_count)::numeric
                  * ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)
              ) / rcc.checked_in_count,
              0
            )
        END
      )::bigint AS spend_cents
    FROM reservation_participants_ext rpe
    JOIN reservation_spend_base rsb ON rsb.reservation_id = rpe.reservation_id
    LEFT JOIN reservation_checkin_counts rcc ON rcc.reservation_id = rpe.reservation_id
    GROUP BY rpe.g_id
  ),$old_case$;

  IF position(old_block in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected reservation_spend case block not found in get_crm_guest_stats';
  END IF;

  fn_sql := replace(
    fn_sql,
    old_block,
    $new_case$
  -- 3-phase spend calculation per participant
  reservation_spend AS (
    SELECT
      rpe.g_id,
      SUM(
        CASE
          -- No target configured → fallback to upfront prepayment split
          WHEN rsb.target_cents = 0 THEN
            ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)

          -- Guest without check-in stays at prepayment share (pending or no-show)
          WHEN NOT rpe.is_checked_in THEN
            ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)

          -- Safety fallback
          WHEN COALESCE(rcc.checked_in_count, 0) = 0 THEN
            ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)

          -- Event still active: checked-in guests show even split of target by full party size
          WHEN rsb.event_id IS NOT NULL AND (rsb.event_end_at IS NULL OR rsb.event_end_at > now()) THEN
            ROUND(rsb.target_cents::numeric / rsb.party_size, 0)

          -- Event ended: checked-in guests absorb remainder after no-show prepayments
          WHEN rsb.event_id IS NOT NULL AND rsb.event_end_at <= now() THEN
            ROUND(
              GREATEST(
                0,
                rsb.target_cents::numeric
                - (rsb.party_size - rcc.checked_in_count)::numeric
                  * ROUND(rsb.prepayment_cents::numeric / rsb.party_size, 0)
              ) / rcc.checked_in_count,
              0
            )

          -- Non-event reservations: checked-in guests use even split of target
          ELSE
            ROUND(rsb.target_cents::numeric / rsb.party_size, 0)
        END
      )::bigint AS spend_cents
    FROM reservation_participants_ext rpe
    JOIN reservation_spend_base rsb ON rsb.reservation_id = rpe.reservation_id
    LEFT JOIN reservation_checkin_counts rcc ON rcc.reservation_id = rpe.reservation_id
    GROUP BY rpe.g_id
  ),$new_case$
  );

  EXECUTE fn_sql;
END
$migration$;