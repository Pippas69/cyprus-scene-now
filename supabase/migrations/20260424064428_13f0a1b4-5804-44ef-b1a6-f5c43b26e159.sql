
CREATE OR REPLACE FUNCTION public.detect_pending_booking_no_shows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _no_show_count integer := 0;
  _row record;
BEGIN
  FOR _row IN
    SELECT pb.id, pb.business_id, pb.event_id
    FROM public.pending_bookings pb
    JOIN public.events e ON e.id = pb.event_id
    WHERE pb.status = 'pending'
      AND pb.event_id IS NOT NULL
      AND e.start_at < now() - interval '10 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.pending_booking_audit_log al
        WHERE al.pending_booking_id = pb.id AND al.action = 'no_show'
      )
  LOOP
    INSERT INTO public.pending_booking_audit_log
      (pending_booking_id, business_id, action, metadata)
    VALUES
      (_row.id, _row.business_id, 'no_show',
       jsonb_build_object('event_id', _row.event_id, 'source', 'cron'));
    _no_show_count := _no_show_count + 1;
  END LOOP;

  RETURN jsonb_build_object('no_show_count', _no_show_count, 'ran_at', now());
END;
$function$;
