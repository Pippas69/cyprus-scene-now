ALTER TABLE public.pending_booking_audit_log
  DROP CONSTRAINT pending_booking_audit_log_pending_booking_id_fkey;

ALTER TABLE public.pending_booking_audit_log
  ADD CONSTRAINT pending_booking_audit_log_pending_booking_id_fkey
  FOREIGN KEY (pending_booking_id)
  REFERENCES public.pending_bookings(id)
  ON DELETE SET NULL;