ALTER TABLE public.offer_purchases
  ALTER COLUMN original_price_cents SET DEFAULT 0,
  ALTER COLUMN discount_percent SET DEFAULT 0,
  ALTER COLUMN final_price_cents SET DEFAULT 0,
  ALTER COLUMN business_payout_cents SET DEFAULT 0;
