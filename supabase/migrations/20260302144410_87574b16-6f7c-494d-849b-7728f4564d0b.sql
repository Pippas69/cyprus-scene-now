
ALTER TABLE public.ticket_orders ADD COLUMN IF NOT EXISTS linked_reservation_id UUID REFERENCES public.reservations(id);

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS ticket_credit_cents INTEGER DEFAULT 0;

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS auto_created_from_tickets BOOLEAN DEFAULT FALSE;
