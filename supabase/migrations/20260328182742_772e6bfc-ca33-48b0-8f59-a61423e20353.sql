DO $migration$
DECLARE
  fn_sql text;
  old_expr text := 'ELSE COALESCE((SELECT stt.prepaid_min_charge_cents FROM public.seating_type_tiers stt WHERE stt.seating_type_id = r.seating_type_id AND COALESCE(r.party_size, 1) BETWEEN stt.min_people AND stt.max_people ORDER BY stt.min_people DESC LIMIT 1), COALESCE(r.prepaid_min_charge_cents, 0))';
  new_expr text := 'ELSE COALESCE(r.prepaid_min_charge_cents, 0)';
BEGIN
  SELECT pg_get_functiondef('public.get_crm_guest_stats(uuid)'::regprocedure)
  INTO fn_sql;

  IF fn_sql IS NULL THEN
    RAISE EXCEPTION 'Function public.get_crm_guest_stats(uuid) not found';
  END IF;

  IF position(old_expr IN fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected expression not found in function';
  END IF;

  fn_sql := replace(fn_sql, old_expr, new_expr);
  EXECUTE fn_sql;
END
$migration$;