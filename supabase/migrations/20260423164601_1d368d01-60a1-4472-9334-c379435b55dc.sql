-- Add BEFORE INSERT trigger to auto-generate token via generate_booking_token()
-- when no token is provided. Keeps existing validate_pending_booking trigger intact.

CREATE OR REPLACE FUNCTION public.set_pending_booking_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.token IS NULL OR length(NEW.token) = 0 THEN
    NEW.token := public.generate_booking_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Run BEFORE the validation trigger (alphabetical order: trg_a_... runs first)
DROP TRIGGER IF EXISTS trg_a_set_pending_booking_token ON public.pending_bookings;
CREATE TRIGGER trg_a_set_pending_booking_token
  BEFORE INSERT ON public.pending_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pending_booking_token();