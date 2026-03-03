-- Add paused column to reservation_seating_types for toggling availability
ALTER TABLE public.reservation_seating_types 
ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.reservation_seating_types.paused IS 'When true, this seating type is temporarily unavailable for new reservations';