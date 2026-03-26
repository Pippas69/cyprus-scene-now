ALTER TABLE public.crm_guests 
  ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seating_preferences text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS food_preferences text DEFAULT NULL;