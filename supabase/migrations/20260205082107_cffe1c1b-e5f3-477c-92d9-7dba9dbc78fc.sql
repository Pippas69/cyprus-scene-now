-- Fix plan history attribution: treat non-active subscriptions as 'free' even if plan_id remains.

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

  -- Effective slug: if subscription isn't active, it's treated as free for attribution.
  -- This matches product behavior where cancel/downgrade can flip status without clearing plan_id.
  effective_new_slug := CASE
    WHEN COALESCE(NEW.status::text, '') = 'active' THEN resolved_new_slug
    ELSE 'free'
  END;

  effective_old_slug := CASE
    WHEN TG_OP = 'UPDATE' AND COALESCE(OLD.status::text, '') = 'active' THEN resolved_old_slug
    WHEN TG_OP = 'UPDATE' THEN 'free'
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
    -- Close currently-open interval
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

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_append_business_plan_history ON public.business_subscriptions;
CREATE TRIGGER trg_append_business_plan_history
AFTER INSERT OR UPDATE ON public.business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.append_business_plan_history();
