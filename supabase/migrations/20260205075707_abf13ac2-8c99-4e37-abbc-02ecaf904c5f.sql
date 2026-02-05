-- Add paid_started_at column to track when business entered paid plan
ALTER TABLE public.business_subscriptions 
ADD COLUMN IF NOT EXISTS paid_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create function to manage paid_started_at automatically
CREATE OR REPLACE FUNCTION public.manage_paid_started_at()
RETURNS TRIGGER AS $$
DECLARE
  new_slug TEXT;
  old_slug TEXT;
BEGIN
  -- Get the slug for the new plan
  IF NEW.plan_id IS NOT NULL THEN
    SELECT slug INTO new_slug FROM public.subscription_plans WHERE id = NEW.plan_id;
  END IF;
  
  -- Get the slug for the old plan (if updating)
  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT NULL THEN
    SELECT slug INTO old_slug FROM public.subscription_plans WHERE id = OLD.plan_id;
  END IF;
  
  -- If inserting or updating to a paid plan (basic, pro, elite) and wasn't on paid before
  IF new_slug IN ('basic', 'pro', 'elite') THEN
    -- Only set paid_started_at if it's NULL or we're coming from free
    IF NEW.paid_started_at IS NULL OR (TG_OP = 'UPDATE' AND (old_slug IS NULL OR old_slug = 'free')) THEN
      NEW.paid_started_at := NOW();
    END IF;
  ELSIF new_slug = 'free' OR new_slug IS NULL THEN
    -- Reset to NULL when downgrading to free
    NEW.paid_started_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically manage paid_started_at
DROP TRIGGER IF EXISTS trigger_manage_paid_started_at ON public.business_subscriptions;
CREATE TRIGGER trigger_manage_paid_started_at
  BEFORE INSERT OR UPDATE ON public.business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_paid_started_at();

-- Initialize paid_started_at for existing paid subscriptions
UPDATE public.business_subscriptions bs
SET paid_started_at = bs.current_period_start
FROM public.subscription_plans sp
WHERE bs.plan_id = sp.id 
  AND sp.slug IN ('basic', 'pro', 'elite')
  AND bs.paid_started_at IS NULL;