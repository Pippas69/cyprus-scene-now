-- Add terms_and_conditions column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS terms_and_conditions text;

-- Add terms column to discounts (offers) table if it doesn't exist
-- Note: discounts table already has a 'terms' column, so we just need events

-- Add cancellation_count to profiles for tracking user cancellations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reservation_cancellation_count integer DEFAULT 0;

-- Add reservation_restricted_until to profiles for enforcement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reservation_restricted_until timestamptz;

COMMENT ON COLUMN public.profiles.reservation_cancellation_count IS 'Count of reservation cancellations for penalty tracking';
COMMENT ON COLUMN public.profiles.reservation_restricted_until IS 'User cannot make reservations until this date (penalty for 3+ cancellations)';