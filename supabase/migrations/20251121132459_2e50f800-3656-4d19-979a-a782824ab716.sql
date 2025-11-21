-- Create event_views table for tracking event impressions
CREATE TABLE public.event_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('feed', 'map', 'search', 'profile', 'direct')),
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_views table for tracking offer impressions
CREATE TABLE public.discount_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('feed', 'event', 'profile', 'direct')),
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_analytics table for aggregated metrics
CREATE TABLE public.daily_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_event_views INT NOT NULL DEFAULT 0,
  unique_event_viewers INT NOT NULL DEFAULT 0,
  total_discount_views INT NOT NULL DEFAULT 0,
  unique_discount_viewers INT NOT NULL DEFAULT 0,
  new_followers INT NOT NULL DEFAULT 0,
  unfollows INT NOT NULL DEFAULT 0,
  new_rsvps_interested INT NOT NULL DEFAULT 0,
  new_rsvps_going INT NOT NULL DEFAULT 0,
  new_reservations INT NOT NULL DEFAULT 0,
  discount_redemptions INT NOT NULL DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, date)
);

-- Enhance business_followers table
ALTER TABLE public.business_followers
ADD COLUMN IF NOT EXISTS unfollowed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('profile', 'event', 'feed', 'search', 'direct'));

-- Create engagement_events table for granular tracking
CREATE TABLE public.engagement_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'website_click', 'phone_click', 'share', 'favorite', 'unfavorite')),
  entity_type TEXT CHECK (entity_type IN ('event', 'discount', 'business')),
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  metadata JSONB
);

-- Enable RLS on new tables
ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_views
CREATE POLICY "Anyone can track event views"
ON public.event_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Business owners can view their event views"
ON public.event_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.businesses b ON e.business_id = b.id
    WHERE e.id = event_views.event_id 
    AND b.user_id = auth.uid()
  )
);

-- RLS Policies for discount_views
CREATE POLICY "Anyone can track discount views"
ON public.discount_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Business owners can view their discount views"
ON public.discount_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.discounts d
    JOIN public.businesses b ON d.business_id = b.id
    WHERE d.id = discount_views.discount_id 
    AND b.user_id = auth.uid()
  )
);

-- RLS Policies for daily_analytics
CREATE POLICY "Business owners can view their analytics"
ON public.daily_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = daily_analytics.business_id 
    AND b.user_id = auth.uid()
  )
);

-- RLS Policies for engagement_events
CREATE POLICY "Anyone can track engagement"
ON public.engagement_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Business owners can view their engagement events"
ON public.engagement_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = engagement_events.business_id 
    AND b.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_event_views_event_id ON public.event_views(event_id);
CREATE INDEX idx_event_views_viewed_at ON public.event_views(viewed_at);
CREATE INDEX idx_event_views_user_id ON public.event_views(user_id);
CREATE INDEX idx_discount_views_discount_id ON public.discount_views(discount_id);
CREATE INDEX idx_discount_views_viewed_at ON public.discount_views(viewed_at);
CREATE INDEX idx_daily_analytics_business_date ON public.daily_analytics(business_id, date DESC);
CREATE INDEX idx_engagement_events_business_id ON public.engagement_events(business_id);
CREATE INDEX idx_engagement_events_created_at ON public.engagement_events(created_at);

-- Create function to update daily_analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
BEGIN
  -- Aggregate analytics for all businesses for yesterday
  INSERT INTO public.daily_analytics (
    business_id,
    date,
    total_event_views,
    unique_event_viewers,
    total_discount_views,
    unique_discount_viewers,
    new_followers,
    unfollows,
    new_rsvps_interested,
    new_rsvps_going,
    new_reservations,
    discount_redemptions
  )
  SELECT 
    b.id as business_id,
    current_date - INTERVAL '1 day' as date,
    COALESCE(ev.total_views, 0) as total_event_views,
    COALESCE(ev.unique_viewers, 0) as unique_event_viewers,
    COALESCE(dv.total_views, 0) as total_discount_views,
    COALESCE(dv.unique_viewers, 0) as unique_discount_viewers,
    COALESCE(f.new_followers, 0) as new_followers,
    COALESCE(f.unfollows, 0) as unfollows,
    COALESCE(r.interested, 0) as new_rsvps_interested,
    COALESCE(r.going, 0) as new_rsvps_going,
    COALESCE(res.reservations, 0) as new_reservations,
    COALESCE(red.redemptions, 0) as discount_redemptions
  FROM public.businesses b
  LEFT JOIN (
    SELECT e.business_id, COUNT(*) as total_views, COUNT(DISTINCT ev.user_id) as unique_viewers
    FROM public.event_views ev
    JOIN public.events e ON ev.event_id = e.id
    WHERE DATE(ev.viewed_at) = current_date - INTERVAL '1 day'
    GROUP BY e.business_id
  ) ev ON b.id = ev.business_id
  LEFT JOIN (
    SELECT d.business_id, COUNT(*) as total_views, COUNT(DISTINCT dv.user_id) as unique_viewers
    FROM public.discount_views dv
    JOIN public.discounts d ON dv.discount_id = d.id
    WHERE DATE(dv.viewed_at) = current_date - INTERVAL '1 day'
    GROUP BY d.business_id
  ) dv ON b.id = dv.business_id
  LEFT JOIN (
    SELECT business_id, 
           SUM(CASE WHEN unfollowed_at IS NULL THEN 1 ELSE 0 END) as new_followers,
           SUM(CASE WHEN unfollowed_at IS NOT NULL THEN 1 ELSE 0 END) as unfollows
    FROM public.business_followers
    WHERE DATE(created_at) = current_date - INTERVAL '1 day'
       OR DATE(unfollowed_at) = current_date - INTERVAL '1 day'
    GROUP BY business_id
  ) f ON b.id = f.business_id
  LEFT JOIN (
    SELECT e.business_id,
           SUM(CASE WHEN rv.status = 'interested' THEN 1 ELSE 0 END) as interested,
           SUM(CASE WHEN rv.status = 'going' THEN 1 ELSE 0 END) as going
    FROM public.rsvps rv
    JOIN public.events e ON rv.event_id = e.id
    WHERE DATE(rv.created_at) = current_date - INTERVAL '1 day'
    GROUP BY e.business_id
  ) r ON b.id = r.business_id
  LEFT JOIN (
    SELECT e.business_id, COUNT(*) as reservations
    FROM public.reservations res
    JOIN public.events e ON res.event_id = e.id
    WHERE DATE(res.created_at) = current_date - INTERVAL '1 day'
    GROUP BY e.business_id
  ) res ON b.id = res.business_id
  LEFT JOIN (
    SELECT d.business_id, COUNT(*) as redemptions
    FROM public.redemptions red
    JOIN public.discounts d ON red.discount_id = d.id
    WHERE DATE(red.redeemed_at) = current_date - INTERVAL '1 day'
    GROUP BY d.business_id
  ) red ON b.id = red.business_id
  ON CONFLICT (business_id, date) 
  DO UPDATE SET
    total_event_views = EXCLUDED.total_event_views,
    unique_event_viewers = EXCLUDED.unique_event_viewers,
    total_discount_views = EXCLUDED.total_discount_views,
    unique_discount_viewers = EXCLUDED.unique_discount_viewers,
    new_followers = EXCLUDED.new_followers,
    unfollows = EXCLUDED.unfollows,
    new_rsvps_interested = EXCLUDED.new_rsvps_interested,
    new_rsvps_going = EXCLUDED.new_rsvps_going,
    new_reservations = EXCLUDED.new_reservations,
    discount_redemptions = EXCLUDED.discount_redemptions,
    updated_at = now();
END;
$$;