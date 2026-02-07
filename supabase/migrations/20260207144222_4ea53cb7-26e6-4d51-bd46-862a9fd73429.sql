-- Fix offer_boosts constraints to support boosted offers with 0% commission
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'offer_boosts'
      AND c.conname = 'offer_boosts_commission_percent_check'
  ) THEN
    EXECUTE 'ALTER TABLE public.offer_boosts DROP CONSTRAINT offer_boosts_commission_percent_check';
  END IF;

  EXECUTE 'ALTER TABLE public.offer_boosts '
       || 'ADD CONSTRAINT offer_boosts_commission_percent_check '
       || 'CHECK (commission_percent = ANY (ARRAY[0, 5, 10, 15, 20, 25]))';
END
$do$;