DO $migration$
DECLARE
  fn_sql text;
  old_block text;
BEGIN
  SELECT pg_get_functiondef('public.get_crm_guest_stats(uuid)'::regprocedure)
  INTO fn_sql;

  old_block := $old_base$
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
  ),$old_base$;

  IF position(old_block in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected reservation_spend_base block not found for tier min-charge patch';
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
      -- target: actual spend if set, otherwise resolved minimum charge (tier/prepaid/ticket-credit)
      CASE
        WHEN COALESCE(r.actual_spend_cents, 0) > 0 THEN r.actual_spend_cents
        ELSE COALESCE(r.prepaid_min_charge_cents, stt.prepaid_min_charge_cents, r.ticket_credit_cents, 0)
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
    LEFT JOIN LATERAL (
      SELECT st.prepaid_min_charge_cents
      FROM public.seating_type_tiers st
      WHERE st.seating_type_id = r.seating_type_id
        AND r.party_size BETWEEN st.min_people AND st.max_people
      ORDER BY st.min_people ASC
      LIMIT 1
    ) stt ON TRUE
    WHERE ((r.event_id IS NULL AND r.business_id = p_business_id) OR (r.event_id IS NOT NULL AND e.business_id = p_business_id))
      AND r.status IN ('accepted', 'completed')
  ),$new_base$
  );

  EXECUTE fn_sql;
END
$migration$;