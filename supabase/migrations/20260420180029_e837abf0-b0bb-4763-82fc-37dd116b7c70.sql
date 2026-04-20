DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['tickets','reservations','reservation_scans','reservation_guests','ticket_orders','rsvps'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
  END LOOP;
END $$;