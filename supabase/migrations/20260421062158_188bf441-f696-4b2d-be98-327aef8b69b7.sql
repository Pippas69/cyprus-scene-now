ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS prepaid_amount_cents INTEGER NULL;

COMMENT ON COLUMN public.ticket_tiers.prepaid_amount_cents IS 'For hybrid events: how many cents per ticket count as deposit toward the linked reservation minimum charge. NULL = full price_cents (backward compatible). The remainder (price_cents - prepaid_amount_cents) is treated as a non-refundable entry fee.';

ALTER TABLE public.ticket_tiers ADD CONSTRAINT ticket_tiers_prepaid_amount_valid CHECK (prepaid_amount_cents IS NULL OR (prepaid_amount_cents >= 0 AND prepaid_amount_cents <= price_cents));