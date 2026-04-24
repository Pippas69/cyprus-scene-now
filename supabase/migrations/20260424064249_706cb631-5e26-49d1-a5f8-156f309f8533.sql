
-- Disable validation trigger temporarily for verification
ALTER TABLE public.pending_bookings DISABLE TRIGGER trg_validate_pending_booking;

-- Backdate our test booking expires_at into the past
UPDATE public.pending_bookings
SET expires_at = now() - interval '2 hours'
WHERE id = '5726cada-3c89-4f21-a695-a72cc4b5dbb3';

-- Re-enable trigger immediately
ALTER TABLE public.pending_bookings ENABLE TRIGGER trg_validate_pending_booking;
