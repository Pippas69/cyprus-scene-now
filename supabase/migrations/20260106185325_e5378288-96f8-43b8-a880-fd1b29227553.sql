-- Add offer_type and credit-related columns to discounts table
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS offer_type TEXT DEFAULT 'regular';
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS bonus_percent INTEGER DEFAULT 0;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS credit_amount_cents INTEGER;

-- Add balance tracking to offer_purchases
ALTER TABLE public.offer_purchases ADD COLUMN IF NOT EXISTS balance_remaining_cents INTEGER DEFAULT 0;

-- Create credit_transactions table for tracking wallet usage
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.offer_purchases(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'redemption', 'refund')),
  balance_before_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  notes TEXT,
  redeemed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions (via purchase ownership)
CREATE POLICY "Users can view own credit transactions"
ON public.credit_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offer_purchases op
    WHERE op.id = credit_transactions.purchase_id
    AND op.user_id = auth.uid()
  )
);

-- Business owners can view and insert transactions for their business
CREATE POLICY "Business owners can view credit transactions"
ON public.credit_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = credit_transactions.business_id
    AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can insert credit transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = credit_transactions.business_id
    AND b.user_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_purchase_id ON public.credit_transactions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_business_id ON public.credit_transactions(business_id);