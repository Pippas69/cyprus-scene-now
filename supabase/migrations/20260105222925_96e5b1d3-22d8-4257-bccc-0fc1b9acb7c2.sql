-- Add commission_free column to discounts table
-- This marks offers that don't charge platform commission (uses subscription allocation)
ALTER TABLE public.discounts 
ADD COLUMN commission_free boolean NOT NULL DEFAULT false;

-- Add index for querying commission-free offers
CREATE INDEX idx_discounts_commission_free ON public.discounts(commission_free) WHERE commission_free = true;

-- Comment for documentation
COMMENT ON COLUMN public.discounts.commission_free IS 'Whether this offer uses a commission-free slot from the business subscription. When true, no platform fee is charged on purchases.';