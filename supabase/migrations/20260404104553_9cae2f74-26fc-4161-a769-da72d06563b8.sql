-- Add source column to reservations
ALTER TABLE public.reservations
ADD COLUMN source text NOT NULL DEFAULT 'profile';

-- Backfill: manual entries → walk_in
UPDATE public.reservations SET source = 'walk_in' WHERE is_manual_entry = true;

-- Backfill: auto-created from tickets → ticket_auto
UPDATE public.reservations SET source = 'ticket_auto' WHERE auto_created_from_tickets = true;

-- Backfill: offer-linked reservations → offer
UPDATE public.reservations SET source = 'offer'
WHERE id IN (SELECT reservation_id FROM public.offer_purchases WHERE reservation_id IS NOT NULL AND claim_type = 'with_reservation');

-- Backfill: walk-in offer reservations → walk_in_offer
UPDATE public.reservations SET source = 'walk_in_offer'
WHERE id IN (SELECT reservation_id FROM public.offer_purchases WHERE reservation_id IS NOT NULL AND claim_type = 'walk_in');

-- Index for filtering
CREATE INDEX idx_reservations_source ON public.reservations (source);