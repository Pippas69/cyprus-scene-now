
-- Drop the existing INSERT-OR-UPDATE trigger and recreate as INSERT-only
DROP TRIGGER IF EXISTS trg_validate_pending_booking ON public.pending_bookings;

CREATE TRIGGER trg_validate_pending_booking
  BEFORE INSERT ON public.pending_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pending_booking();
