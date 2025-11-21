-- Fix search_path for update_daily_analytics function
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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