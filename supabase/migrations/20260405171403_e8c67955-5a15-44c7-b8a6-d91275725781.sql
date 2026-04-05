ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS guest_ages text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS guest_city text;