-- Use downgraded_to_free_at as the transition timestamp when switching to effective 'free'
-- so analytics attribution starts exactly at the user cancel time.

CREATE OR REPLACE FUNCTION public.append_business_plan_history()
RETURNS TRIGGER AS $$
DECLARE
  resolved_new_slug TEXT;
  resolved_old_slug TEXT;
  effective_new_slug TEXT;
  effective_old_slug TEXT;
  ts TIMESTAMP WITH TIME ZONE;
  transition_ts TIMESTAMP WITH TIME ZONE;
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

  -- Choose an accurate transition timestamp.
  transition_ts := ts;
  IF TG_OP = 'UPDATE'
     AND effective_new_slug = 'free'
     AND effective_old_slug IS DISTINCT FROM 'free'
     AND NEW.downgraded_to_free_at IS NOT NULL THEN
    transition_ts := NEW.downgraded_to_free_at;
  END IF;

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
    UPDATE public.business_subscription_plan_history
      SET valid_to = transition_ts
    WHERE business_id = NEW.business_id
      AND valid_to IS NULL;

    INSERT INTO public.business_subscription_plan_history (business_id, plan_slug, valid_from, valid_to, source)
    VALUES (
      NEW.business_id,
      effective_new_slug,
      transition_ts,
      NULL,
      'trigger'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_append_business_plan_history ON public.business_subscriptions;
CREATE TRIGGER trg_append_business_plan_history
AFTER INSERT OR UPDATE ON public.business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.append_business_plan_history();
