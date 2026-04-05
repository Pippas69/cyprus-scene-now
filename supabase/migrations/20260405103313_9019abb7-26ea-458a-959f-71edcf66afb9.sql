
-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  action text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role can access (edge functions use service role)

-- Index for efficient lookups
CREATE INDEX idx_rate_limit_key_created ON public.rate_limit_entries (key, created_at DESC);

-- Index for cleanup
CREATE INDEX idx_rate_limit_created ON public.rate_limit_entries (created_at);

-- Cleanup function: remove entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_entries
  WHERE created_at < now() - interval '1 hour';
$$;
