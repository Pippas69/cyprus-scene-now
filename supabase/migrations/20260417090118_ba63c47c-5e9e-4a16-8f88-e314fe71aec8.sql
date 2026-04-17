ALTER TABLE public.promoter_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promoter_applications;