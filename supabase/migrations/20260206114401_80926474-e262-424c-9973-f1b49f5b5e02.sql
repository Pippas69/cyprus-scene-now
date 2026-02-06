-- Increase confirmation_code column length in reservations table
ALTER TABLE public.reservations 
ALTER COLUMN confirmation_code TYPE VARCHAR(20);