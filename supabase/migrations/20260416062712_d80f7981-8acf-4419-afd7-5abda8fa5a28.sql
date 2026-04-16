ALTER TABLE public.events ADD COLUMN minimum_age integer DEFAULT NULL;

-- Add a check constraint to ensure minimum_age is between 16 and 99 if set
ALTER TABLE public.events ADD CONSTRAINT events_minimum_age_range CHECK (minimum_age IS NULL OR (minimum_age >= 16 AND minimum_age <= 99));