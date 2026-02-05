-- 1. Add downgraded_to_free_at column to capture the MOMENT a business cancels/downgrades,
--    even while they remain active until period end.
ALTER TABLE public.business_subscriptions
ADD COLUMN IF NOT EXISTS downgraded_to_free_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN public.business_subscriptions.downgraded_to_free_at IS 'Timestamp when the user clicked cancel/downgrade—used for analytics attribution. Reset to NULL when upgrading to a paid plan again.';

-- 2. Update the plan history trigger to use downgraded_to_free_at for analytics
CREATE OR REPLACE FUNCTION public.append_business_plan_history()
RETURNS TRIGGER AS $$
DECLARE
  resolved_new_slug TEXT;
  resolved_old_slug TEXT;
  effective_new_slug TEXT;
  effective_old_slug TEXT;
  ts TIMESTAMP WITH TIME ZONE;
BEGIN
  ts := statement_timestamp();

  -- Resolve raw plan slugs from plan_id
  IF NEW.plan_id IS NOT NULL THEN
    SELECT slug INTO resolved_new_slug FROM public.subscription_plans WHERE id = NEW.plan_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT NULL THEN
    SELECT slug INTO resolved_old_slug FROM public.subscription_plans WHERE id = OLD.plan_id;
  END IF;

  resolved_new_slug := COALESCE(resolved_new_slug, 'free');
  resolved_old_slug := COALESCE(resolved_old_slug, 'free');

  -- Effective slug for analytics:
  --   1. If downgraded_to_free_at is set, treat as 'free' (even if still active until period end).
  --   2. Else if status != active, treat as 'free'.
  --   3. Else use actual plan slug.
  effective_new_slug := CASE
    WHEN NEW.downgraded_to_free_at IS NOT NULL THEN 'free'
    WHEN COALESCE(NEW.status::text, '') = 'active' THEN resolved_new_slug
    ELSE 'free'
  END;

  effective_old_slug := CASE
    WHEN TG_OP = 'UPDATE' THEN
      CASE
        WHEN OLD.downgraded_to_free_at IS NOT NULL THEN 'free'
        WHEN COALESCE(OLD.status::text, '') = 'active' THEN resolved_old_slug
        ELSE 'free'
      END
    ELSE 'free'
  END;

  -- On INSERT: create initial open-ended interval
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_subscription_plan_history (business_id, plan_slug, valid_from, valid_to, source)
    VALUES (
      NEW.business_id,
      effective_new_slug,
      COALESCE(NEW.current_period_start, ts),
      NULL,
      'trigger'
    );
    RETURN NEW;
  END IF;

  -- On UPDATE: only write history if the effective plan changed
  IF TG_OP = 'UPDATE' AND effective_new_slug IS DISTINCT FROM effective_old_slug THEN
    -- Close currently-open interval (use half-open semantics: valid_to is exclusive)
    UPDATE public.business_subscription_plan_history
      SET valid_to = ts
    WHERE business_id = NEW.business_id
      AND valid_to IS NULL;

    -- Start new interval
    INSERT INTO public.business_subscription_plan_history (business_id, plan_slug, valid_from, valid_to, source)
    VALUES (
      NEW.business_id,
      effective_new_slug,
      ts,
      NULL,
      'trigger'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_append_business_plan_history ON public.business_subscriptions;
CREATE TRIGGER trg_append_business_plan_history
AFTER INSERT OR UPDATE ON public.business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.append_business_plan_history();