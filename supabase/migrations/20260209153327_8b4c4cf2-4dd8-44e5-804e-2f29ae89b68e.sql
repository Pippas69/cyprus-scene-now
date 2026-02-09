
-- Add column to track which plan the business is downgrading to
ALTER TABLE public.business_subscriptions 
ADD COLUMN IF NOT EXISTS downgrade_target_plan text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.business_subscriptions.downgrade_target_plan IS 'The plan slug the business is downgrading to (e.g., free, basic, pro). NULL means no downgrade pending.';
