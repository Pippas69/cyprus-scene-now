-- Add payment link tracking columns to offer_purchases
ALTER TABLE public.offer_purchases 
ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_link_url TEXT;

-- Add index for finding expired pending payments efficiently
CREATE INDEX IF NOT EXISTS idx_offer_purchases_awaiting_payment 
ON public.offer_purchases (status, payment_link_expires_at) 
WHERE status = 'awaiting_payment';