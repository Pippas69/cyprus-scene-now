-- Add missing column amount_paid_cents to offer_purchases (referenced by old code)
ALTER TABLE public.offer_purchases
ADD COLUMN IF NOT EXISTS amount_paid_cents integer DEFAULT 0;
