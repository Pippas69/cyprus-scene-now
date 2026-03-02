
-- Add flag to businesses for Kaliva-specific ticket+reservation flow
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS ticket_reservation_linked BOOLEAN DEFAULT FALSE;

-- Add guest info columns to tickets for per-person data
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_age INTEGER;
