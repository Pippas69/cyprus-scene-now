-- Allow multiple boosts per offer over time (but only one ACTIVE per offer at a time)
DO $do$
BEGIN
  -- Drop the old UNIQUE(discount_id) constraint if present
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'offer_boosts'
      AND c.conname = 'offer_boosts_discount_id_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.offer_boosts DROP CONSTRAINT offer_boosts_discount_id_key';
  END IF;
END
$do$;

-- Enforce at most one active boost per offer
CREATE UNIQUE INDEX IF NOT EXISTS offer_boosts_one_active_per_discount
ON public.offer_boosts (discount_id)
WHERE active IS TRUE;