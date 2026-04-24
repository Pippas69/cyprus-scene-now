ALTER TABLE public.sms_billing_attempts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sms_billing_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_billing_attempts;
  END IF;
END$$;