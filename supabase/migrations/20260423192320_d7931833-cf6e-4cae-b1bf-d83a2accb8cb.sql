
ALTER TABLE public.pending_bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pending_bookings_stripe_session
  ON public.pending_bookings (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
