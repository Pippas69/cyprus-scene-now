-- Create boost_analytics table to track performance metrics for each boost
CREATE TABLE public.boost_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id UUID NOT NULL REFERENCES public.event_boosts(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  rsvps_interested INTEGER NOT NULL DEFAULT 0,
  rsvps_going INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(boost_id, date)
);

-- Enable RLS
ALTER TABLE public.boost_analytics ENABLE ROW LEVEL SECURITY;

-- Business owners can view analytics for their own boosts
CREATE POLICY "Business owners can view their boost analytics"
ON public.boost_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_boosts eb
    JOIN public.businesses b ON eb.business_id = b.id
    WHERE eb.id = boost_analytics.boost_id
    AND b.user_id = auth.uid()
  )
);

-- Admins can view all boost analytics
CREATE POLICY "Admins can view all boost analytics"
ON public.boost_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow system inserts/updates (for tracking)
CREATE POLICY "Anyone can insert boost analytics"
ON public.boost_analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update boost analytics"
ON public.boost_analytics
FOR UPDATE
USING (true);

-- Create function to update boost analytics on event view
CREATE OR REPLACE FUNCTION public.update_boost_analytics_on_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_boost_id UUID;
BEGIN
  -- Check if the viewed event has an active boost
  SELECT id INTO active_boost_id
  FROM public.event_boosts
  WHERE event_id = NEW.event_id
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  LIMIT 1;

  -- If active boost exists, update or insert analytics
  IF active_boost_id IS NOT NULL THEN
    INSERT INTO public.boost_analytics (boost_id, event_id, date, impressions, unique_viewers)
    VALUES (active_boost_id, NEW.event_id, CURRENT_DATE, 1, 1)
    ON CONFLICT (boost_id, date)
    DO UPDATE SET
      impressions = boost_analytics.impressions + 1,
      unique_viewers = CASE 
        WHEN NEW.session_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.event_views 
          WHERE event_id = NEW.event_id 
          AND session_id = NEW.session_id 
          AND viewed_at < NEW.viewed_at
          AND viewed_at >= CURRENT_DATE
        ) THEN boost_analytics.unique_viewers + 1
        ELSE boost_analytics.unique_viewers
      END,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on event_views
CREATE TRIGGER trigger_update_boost_analytics_on_view
AFTER INSERT ON public.event_views
FOR EACH ROW
EXECUTE FUNCTION public.update_boost_analytics_on_view();

-- Create function to update boost analytics on RSVP
CREATE OR REPLACE FUNCTION public.update_boost_analytics_on_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_boost_id UUID;
BEGIN
  -- Check if the event has an active boost
  SELECT id INTO active_boost_id
  FROM public.event_boosts
  WHERE event_id = NEW.event_id
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  LIMIT 1;

  -- If active boost exists, update analytics
  IF active_boost_id IS NOT NULL THEN
    INSERT INTO public.boost_analytics (boost_id, event_id, date, rsvps_interested, rsvps_going)
    VALUES (
      active_boost_id, 
      NEW.event_id, 
      CURRENT_DATE,
      CASE WHEN NEW.status = 'interested' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'going' THEN 1 ELSE 0 END
    )
    ON CONFLICT (boost_id, date)
    DO UPDATE SET
      rsvps_interested = boost_analytics.rsvps_interested + CASE WHEN NEW.status = 'interested' THEN 1 ELSE 0 END,
      rsvps_going = boost_analytics.rsvps_going + CASE WHEN NEW.status = 'going' THEN 1 ELSE 0 END,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on rsvps
CREATE TRIGGER trigger_update_boost_analytics_on_rsvp
AFTER INSERT ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_boost_analytics_on_rsvp();

-- Add index for performance
CREATE INDEX idx_boost_analytics_boost_id ON public.boost_analytics(boost_id);
CREATE INDEX idx_boost_analytics_date ON public.boost_analytics(date);
CREATE INDEX idx_event_boosts_active ON public.event_boosts(event_id, status) WHERE status = 'active';