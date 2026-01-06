-- Add hourly boosting support columns to event_boosts
ALTER TABLE public.event_boosts
ADD COLUMN IF NOT EXISTS duration_hours integer;

-- Add hourly boosting support columns to offer_boosts
ALTER TABLE public.offer_boosts
ADD COLUMN IF NOT EXISTS duration_hours integer;

-- Add comments for documentation
COMMENT ON COLUMN public.event_boosts.duration_mode IS 'Duration mode: hourly or daily';
COMMENT ON COLUMN public.event_boosts.hourly_rate_cents IS 'Hourly rate in cents when using hourly mode';
COMMENT ON COLUMN public.event_boosts.duration_hours IS 'Number of hours for hourly mode boosts';

COMMENT ON COLUMN public.offer_boosts.duration_mode IS 'Duration mode: hourly or daily';
COMMENT ON COLUMN public.offer_boosts.hourly_rate_cents IS 'Hourly rate in cents when using hourly mode';
COMMENT ON COLUMN public.offer_boosts.duration_hours IS 'Number of hours for hourly mode boosts';