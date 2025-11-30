-- Add original_price_cents to discounts table for commission calculation
ALTER TABLE public.discounts 
ADD COLUMN IF NOT EXISTS original_price_cents INTEGER;

COMMENT ON COLUMN public.discounts.original_price_cents IS 'Original price in cents before discount, used for commission calculation';

-- Create function to automatically update event_boosts status based on dates
CREATE OR REPLACE FUNCTION update_boost_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Activate scheduled boosts that have reached start_date
  UPDATE public.event_boosts
  SET status = 'active'
  WHERE status = 'scheduled'
    AND start_date <= CURRENT_DATE;

  -- Deactivate active boosts that have passed end_date
  UPDATE public.event_boosts
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$;

COMMENT ON FUNCTION update_boost_status() IS 'Automatically updates event boost status based on start/end dates';