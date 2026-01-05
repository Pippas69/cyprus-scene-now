-- Add columns to offer_boosts to match event_boosts structure
ALTER TABLE public.offer_boosts
ADD COLUMN IF NOT EXISTS boost_tier text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date date DEFAULT CURRENT_DATE + INTERVAL '7 days',
ADD COLUMN IF NOT EXISTS daily_rate_cents integer DEFAULT 1500,
ADD COLUMN IF NOT EXISTS total_cost_cents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS source text DEFAULT 'subscription';

-- Update targeting_quality to match tier values (50, 70, 85, 100 instead of 5-25)
-- Keep the column but we'll use it differently now