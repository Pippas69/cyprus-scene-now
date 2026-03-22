
-- Add deferred payment columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS deferred_payment_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deferred_confirmation_hours INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS deferred_cancellation_fee_percent INTEGER DEFAULT 50;

-- Add deferred payment tracking columns to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS deferred_payment_mode TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deferred_confirmation_deadline TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deferred_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT DEFAULT NULL;

-- Add validation trigger for deferred_payment_mode
CREATE OR REPLACE FUNCTION public.validate_deferred_payment_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deferred_payment_mode IS NOT NULL AND NEW.deferred_payment_mode NOT IN ('auth_hold', 'setup_intent') THEN
    RAISE EXCEPTION 'Invalid deferred_payment_mode: %', NEW.deferred_payment_mode;
  END IF;
  IF NEW.deferred_status IS NOT NULL AND NEW.deferred_status NOT IN ('awaiting_confirmation', 'confirmed', 'cancelled', 'auto_charged', 'expired') THEN
    RAISE EXCEPTION 'Invalid deferred_status: %', NEW.deferred_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_deferred_payment ON public.reservations;
CREATE TRIGGER trg_validate_deferred_payment
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deferred_payment_mode();
