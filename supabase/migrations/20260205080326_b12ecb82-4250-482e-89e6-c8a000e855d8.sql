-- 1) Plan history table
CREATE TABLE IF NOT EXISTS public.business_subscription_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  plan_slug TEXT NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE NULL,
  source TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsplh_business_from ON public.business_subscription_plan_history (business_id, valid_from);
CREATE INDEX IF NOT EXISTS idx_bsplh_business_to ON public.business_subscription_plan_history (business_id, valid_to);

-- 2) Enable RLS
ALTER TABLE public.business_subscription_plan_history ENABLE ROW LEVEL SECURITY;

-- 3) Read access for the business owner
DROP POLICY IF EXISTS "Business owners can read their plan history" ON public.business_subscription_plan_history;
CREATE POLICY "Business owners can read their plan history"
ON public.business_subscription_plan_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = business_subscription_plan_history.business_id
      AND b.user_id = auth.uid()
  )
);

-- 4) Function to append history on subscription changes
CREATE OR REPLACE FUNCTION public.append_business_plan_history()
RETURNS TRIGGER AS $$
DECLARE
  new_slug TEXT;
  old_slug TEXT;
  ts TIMESTAMP WITH TIME ZONE;
BEGIN
  ts := statement_timestamp();

  -- Resolve plan slugs
  IF NEW.plan_id IS NOT NULL THEN
    SELECT slug INTO new_slug FROM public.subscription_plans WHERE id = NEW.plan_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT NULL THEN
    SELECT slug INTO old_slug FROM public.subscription_plans WHERE id = OLD.plan_id;
  END IF;

  -- Normalize NULL to 'free'
  new_slug := COALESCE(new_slug, 'free');
  old_slug := COALESCE(old_slug, 'free');

  -- On INSERT: create the initial open-ended interval
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_subscription_plan_history (business_id, plan_slug, valid_from, valid_to, source)
    VALUES (
      NEW.business_id,
      new_slug,
      COALESCE(NEW.current_period_start, ts),
      NULL,
      'trigger'
    );
    RETURN NEW;
  END IF;

  -- On UPDATE: only write history if the plan actually changed
  IF TG_OP = 'UPDATE' AND new_slug IS DISTINCT FROM old_slug THEN
    -- Close currently-open interval
    UPDATE public.business_subscription_plan_history
      SET valid_to = ts
    WHERE business_id = NEW.business_id
      AND valid_to IS NULL;

    -- Start new interval
    INSERT INTO public.business_subscription_plan_history (business_id, plan_slug, valid_from, valid_to, source)
    VALUES (
      NEW.business_id,
      new_slug,
      ts,
      NULL,
      'trigger'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Trigger
DROP TRIGGER IF EXISTS trg_append_business_plan_history ON public.business_subscriptions;
CREATE TRIGGER trg_append_business_plan_history
AFTER INSERT OR UPDATE ON public.business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.append_business_plan_history();