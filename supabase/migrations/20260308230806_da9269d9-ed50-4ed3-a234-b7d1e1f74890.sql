
-- Create table for per-guest QR codes on offer purchases (walk-in and all types)
CREATE TABLE public.offer_purchase_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.offer_purchases(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  qr_code_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'active',
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(qr_code_token)
);

-- Enable RLS
ALTER TABLE public.offer_purchase_guests ENABLE ROW LEVEL SECURITY;

-- Users can read their own purchase guests
CREATE POLICY "Users can view own offer purchase guests"
  ON public.offer_purchase_guests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offer_purchases op
      WHERE op.id = offer_purchase_guests.purchase_id
      AND op.user_id = auth.uid()
    )
  );

-- Business owners can view guests for their offers
CREATE POLICY "Business owners can view offer purchase guests"
  ON public.offer_purchase_guests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offer_purchases op
      JOIN public.businesses b ON b.id = op.business_id
      WHERE op.id = offer_purchase_guests.purchase_id
      AND b.user_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_offer_purchase_guests_purchase_id ON public.offer_purchase_guests(purchase_id);
CREATE INDEX idx_offer_purchase_guests_qr_token ON public.offer_purchase_guests(qr_code_token);
