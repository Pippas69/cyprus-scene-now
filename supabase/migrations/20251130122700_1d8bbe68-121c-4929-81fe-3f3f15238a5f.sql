-- Fix search_path for update_boost_status function
CREATE OR REPLACE FUNCTION update_boost_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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