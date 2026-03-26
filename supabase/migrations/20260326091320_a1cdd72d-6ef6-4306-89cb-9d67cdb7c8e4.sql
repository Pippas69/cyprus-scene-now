DO $$
DECLARE
  fn_sql text;
BEGIN
  SELECT pg_get_functiondef('public.get_crm_guest_stats(uuid)'::regprocedure)
  INTO fn_sql;

  IF fn_sql IS NULL THEN
    RAISE EXCEPTION 'Function public.get_crm_guest_stats(uuid) not found';
  END IF;

  IF position('tord.total_amount_cents' in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected tord.total_amount_cents reference not found';
  END IF;

  IF position('tord.quantity' in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected tord.quantity reference not found';
  END IF;

  fn_sql := replace(fn_sql, 'tord.total_amount_cents', 'tord.total_cents');

  fn_sql := replace(
    fn_sql,
    'tord.quantity',
    'COALESCE((SELECT COUNT(*) FROM public.tickets tx WHERE tx.order_id = tord.id), 1)'
  );

  EXECUTE fn_sql;
END $$;