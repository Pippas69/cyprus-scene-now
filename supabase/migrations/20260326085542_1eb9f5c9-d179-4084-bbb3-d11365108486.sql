DO $$
BEGIN
  IF to_regclass('public.seating_types') IS NULL THEN
    EXECUTE 'CREATE VIEW public.seating_types AS SELECT id, seating_type AS name FROM public.reservation_seating_types';
  ELSE
    EXECUTE 'CREATE OR REPLACE VIEW public.seating_types AS SELECT id, seating_type AS name FROM public.reservation_seating_types';
  END IF;
END
$$;