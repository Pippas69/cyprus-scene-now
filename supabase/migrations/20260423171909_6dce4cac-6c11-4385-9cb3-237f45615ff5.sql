-- 1. Rename enum value 'expired' → 'link_expired'
ALTER TYPE public.pending_booking_status RENAME VALUE 'expired' TO 'link_expired';

-- 2. Update expire_old_pending_bookings() to use new value
CREATE OR REPLACE FUNCTION public.expire_old_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.pending_bookings
  SET status = 'link_expired'
  WHERE status = 'pending' AND expires_at <= now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$function$;

-- 3. Add care_of column (free text, nullable)
ALTER TABLE public.pending_bookings
ADD COLUMN care_of text;

COMMENT ON COLUMN public.pending_bookings.care_of IS 'Free text identifier of the staff member who created this pending booking (e.g. "Maria", "Bar #2").';