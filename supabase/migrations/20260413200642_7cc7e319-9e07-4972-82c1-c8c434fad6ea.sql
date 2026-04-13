
-- Create event_invitations table
CREATE TABLE public.event_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  guest_city TEXT,
  guest_age INTEGER,
  min_age INTEGER,
  party_size INTEGER NOT NULL DEFAULT 1,
  seating_type_id UUID,
  invitation_type TEXT NOT NULL DEFAULT 'ticket' CHECK (invitation_type IN ('ticket', 'reservation', 'walk_in', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'used')),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  ticket_order_id UUID REFERENCES public.ticket_orders(id) ON DELETE SET NULL,
  qr_code_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- Policies: only business owner can manage invitations
CREATE POLICY "Business owners can view their invitations"
  ON public.event_invitations FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can create invitations"
  ON public.event_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "Business owners can update invitations"
  ON public.event_invitations FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete invitations"
  ON public.event_invitations FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_event_invitations_event_id ON public.event_invitations(event_id);
CREATE INDEX idx_event_invitations_business_id ON public.event_invitations(business_id);
CREATE INDEX idx_event_invitations_status ON public.event_invitations(status);

-- Trigger for updated_at
CREATE TRIGGER update_event_invitations_updated_at
  BEFORE UPDATE ON public.event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
