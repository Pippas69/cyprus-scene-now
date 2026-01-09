-- Add requires_reservation column to discounts table
ALTER TABLE public.discounts
ADD COLUMN IF NOT EXISTS requires_reservation boolean DEFAULT false;

-- Add reservation_id column to offer_purchases table to link purchases with reservations
ALTER TABLE public.offer_purchases
ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_offer_purchases_reservation_id 
ON public.offer_purchases(reservation_id);

-- Add comment for documentation
COMMENT ON COLUMN public.discounts.requires_reservation IS 'If true, users must make a reservation when purchasing this offer';
COMMENT ON COLUMN public.offer_purchases.reservation_id IS 'Links the offer purchase to a reservation if requires_reservation was true';