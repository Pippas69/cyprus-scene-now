DO $$
DECLARE
  fn_sql text;
BEGIN
  SELECT pg_get_functiondef('public.get_crm_guest_stats(uuid)'::regprocedure)
  INTO fn_sql;

  IF fn_sql IS NULL THEN
    RAISE EXCEPTION 'Function public.get_crm_guest_stats(uuid) not found';
  END IF;

  IF position('stt.min_spend_cents' in fn_sql) = 0 THEN
    RAISE EXCEPTION 'Expected stt.min_spend_cents reference not found';
  END IF;

  fn_sql := replace(fn_sql, 'stt.min_spend_cents', 'stt.prepaid_min_charge_cents');

  fn_sql := replace(
    fn_sql,
    'stt.tier_size = COALESCE((SELECT COUNT(*) FROM public.tickets tx WHERE tx.order_id = tord.id), 1)',
    'COALESCE((SELECT COUNT(*) FROM public.tickets tx WHERE tx.order_id = tord.id), 1) BETWEEN stt.min_people AND stt.max_people'
  );

  fn_sql := replace(
    fn_sql,
    'stt.tier_size = r.party_size',
    'r.party_size BETWEEN stt.min_people AND stt.max_people'
  );

  EXECUTE fn_sql;
END $$;