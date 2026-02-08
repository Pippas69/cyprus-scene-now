-- Add frozen time columns to event_boosts and offer_boosts
ALTER TABLE public.event_boosts 
ADD COLUMN frozen_hours integer DEFAULT 0,
ADD COLUMN frozen_days integer DEFAULT 0;

ALTER TABLE public.offer_boosts 
ADD COLUMN frozen_hours integer DEFAULT 0,
ADD COLUMN frozen_days integer DEFAULT 0;