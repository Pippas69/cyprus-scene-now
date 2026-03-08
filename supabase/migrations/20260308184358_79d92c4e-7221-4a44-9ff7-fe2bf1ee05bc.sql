
-- Create reservation_guests table for per-guest QR codes
CREATE TABLE public.reservation_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  qr_code_token text NOT NULL DEFAULT gen_random_uuid()::text,
  checked_in_at timestamptz,
  checked_in_by uuid,
  status text NOT NULL DEFAULT 'valid',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_guests_reservation_id ON public.reservation_guests(reservation_id);
CREATE UNIQUE INDEX idx_reservation_guests_qr_token ON public.reservation_guests(qr_code_token);

ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;

-- Users can read their own reservation guests
CREATE POLICY "Users can read own reservation guests" ON public.reservation_guests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r 
      WHERE r.id = reservation_guests.reservation_id 
      AND r.user_id = auth.uid()
    )
  );

-- Users can insert guests for their own reservations
CREATE POLICY "Users can insert own reservation guests" ON public.reservation_guests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservations r 
      WHERE r.id = reservation_guests.reservation_id 
      AND r.user_id = auth.uid()
    )
  );

-- Business owners can read guests for reservations in their business
CREATE POLICY "Business owners can read reservation guests" ON public.reservation_guests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_guests.reservation_id
      AND (
        r.business_id IN (SELECT b.id FROM public.businesses b WHERE b.user_id = auth.uid())
        OR r.event_id IN (SELECT e.id FROM public.events e WHERE e.business_id IN (SELECT b2.id FROM public.businesses b2 WHERE b2.user_id = auth.uid()))
      )
    )
  );

-- Business owners can update guests (for check-in)
CREATE POLICY "Business owners can update reservation guests" ON public.reservation_guests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_guests.reservation_id
      AND (
        r.business_id IN (SELECT b.id FROM public.businesses b WHERE b.user_id = auth.uid())
        OR r.event_id IN (SELECT e.id FROM public.events e WHERE e.business_id IN (SELECT b2.id FROM public.businesses b2 WHERE b2.user_id = auth.uid()))
      )
    )
  );

-- Add realtime for reservation_guests
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_guests;
