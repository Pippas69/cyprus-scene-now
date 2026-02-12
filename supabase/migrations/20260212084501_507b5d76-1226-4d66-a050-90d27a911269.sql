
ALTER TABLE public.event_boosts ADD COLUMN IF NOT EXISTS partial_budget_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.offer_boosts ADD COLUMN IF NOT EXISTS partial_budget_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.profile_boosts ADD COLUMN IF NOT EXISTS partial_budget_cents integer NOT NULL DEFAULT 0;
