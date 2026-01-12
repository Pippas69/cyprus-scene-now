-- Add party_size column to offer_purchases for tracking group claims
ALTER TABLE public.offer_purchases ADD COLUMN IF NOT EXISTS party_size INTEGER DEFAULT 1;

-- Add claim_type to distinguish walk-in vs reservation claims
ALTER TABLE public.offer_purchases ADD COLUMN IF NOT EXISTS claim_type TEXT DEFAULT 'walk_in';