
-- Add retry count column
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS deferred_retry_count INTEGER DEFAULT 0;

-- Drop old constraint and add updated one with payment_failed
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_deferred_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_deferred_status_check 
  CHECK (deferred_status IS NULL OR deferred_status IN ('awaiting_confirmation', 'confirmed', 'auto_charged', 'cancelled', 'payment_failed'));
