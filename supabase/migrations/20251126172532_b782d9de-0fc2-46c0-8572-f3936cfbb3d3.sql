-- Create a view for connection statistics (this works)
CREATE OR REPLACE VIEW public.connection_stats_monitor AS
SELECT 
  state,
  COUNT(*) as connection_count,
  NOW() as checked_at
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Grant access to view
GRANT SELECT ON public.connection_stats_monitor TO authenticated, service_role;

-- Create a simple table to log monitoring events
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can read monitoring alerts
CREATE POLICY "Admins can view monitoring alerts"
  ON public.monitoring_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can insert alerts
CREATE POLICY "Service role can insert alerts"
  ON public.monitoring_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);