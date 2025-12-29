-- Update discounts table with new required fields
ALTER TABLE public.discounts 
ADD COLUMN IF NOT EXISTS max_purchases INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_per_user INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_purchased INTEGER DEFAULT 0;

-- Create offer_purchases table for prepaid offers
CREATE TABLE public.offer_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Pricing
  original_price_cents INTEGER NOT NULL,
  discount_percent INTEGER NOT NULL,
  final_price_cents INTEGER NOT NULL,
  
  -- Commission (for FOMO revenue)
  commission_percent INTEGER NOT NULL DEFAULT 0,
  commission_amount_cents INTEGER NOT NULL DEFAULT 0,
  business_payout_cents INTEGER NOT NULL,
  
  -- Status: pending (checkout started), paid (payment success), redeemed (used at venue), expired, refunded
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- QR Code (generated after payment)
  qr_code_token TEXT UNIQUE,
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  
  -- Redemption
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Constraint for status values
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'redeemed', 'expired', 'refunded'))
);

-- Create indexes for performance
CREATE INDEX idx_offer_purchases_discount_id ON public.offer_purchases(discount_id);
CREATE INDEX idx_offer_purchases_user_id ON public.offer_purchases(user_id);
CREATE INDEX idx_offer_purchases_business_id ON public.offer_purchases(business_id);
CREATE INDEX idx_offer_purchases_status ON public.offer_purchases(status);
CREATE INDEX idx_offer_purchases_qr_code_token ON public.offer_purchases(qr_code_token);

-- Enable RLS
ALTER TABLE public.offer_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offer_purchases

-- Users can view their own purchases
CREATE POLICY "Users can view their own offer purchases"
ON public.offer_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create purchases (for checkout initiation)
CREATE POLICY "Users can create offer purchases"
ON public.offer_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Businesses can view purchases for their offers
CREATE POLICY "Businesses can view purchases for their offers"
ON public.offer_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = offer_purchases.business_id
    AND b.user_id = auth.uid()
  )
);

-- Businesses can update purchases to redeemed status
CREATE POLICY "Businesses can redeem purchases for their offers"
ON public.offer_purchases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = offer_purchases.business_id
    AND b.user_id = auth.uid()
  )
  AND status = 'paid'
);

-- Create trigger for updated_at
CREATE TRIGGER update_offer_purchases_updated_at
BEFORE UPDATE ON public.offer_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update discounts RLS to allow public viewing of active discounts with prices
CREATE POLICY "Anyone can view active discounts with prices"
ON public.discounts
FOR SELECT
USING (
  active = true 
  AND start_at <= now() 
  AND end_at >= now()
);