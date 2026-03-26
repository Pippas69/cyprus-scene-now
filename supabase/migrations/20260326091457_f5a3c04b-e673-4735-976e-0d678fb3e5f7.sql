DO $$
DECLARE
  fn_sql text;
BEGIN
  SELECT pg_get_functiondef('public.get_crm_guest_stats(uuid)'::regprocedure)
  INTO fn_sql;

  IF fn_sql IS NULL THEN
    RAISE EXCEPTION 'Function public.get_crm_guest_stats(uuid) not found';
  END IF;

  IF position('r.prepayment_amount_cents' in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected r.prepayment_amount_cents reference not found';
  END IF;

  fn_sql := replace(fn_sql, 'r.prepayment_amount_cents', 'r.prepaid_min_charge_cents');

  EXECUTE fn_sql;
END $$;