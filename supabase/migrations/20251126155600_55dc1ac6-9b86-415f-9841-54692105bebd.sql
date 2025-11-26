-- Fix function search paths for security
-- Update functions that are missing SET search_path

-- Fix search_content function
CREATE OR REPLACE FUNCTION public.search_content(search_query text)
RETURNS TABLE(result_type text, id uuid, name text, title text, logo_url text, cover_image_url text, city text, location text, start_at timestamp with time zone, category text[], business_name text, verified boolean, relevance_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'business'::TEXT as result_type,
    b.id,
    b.name,
    NULL::TEXT as title,
    b.logo_url,
    NULL::TEXT as cover_image_url,
    b.city,
    NULL::TEXT as location,
    NULL::TIMESTAMPTZ as start_at,
    b.category,
    NULL::TEXT as business_name,
    b.verified,
    (
      CASE 
        WHEN LOWER(b.name) = LOWER(search_query) THEN 100
        WHEN LOWER(b.name) LIKE LOWER(search_query) || '%' THEN 90
        WHEN LOWER(b.name) LIKE '%' || LOWER(search_query) || '%' THEN 70
        WHEN LOWER(b.city) = LOWER(search_query) THEN 60
        WHEN search_query = ANY(
          SELECT LOWER(unnest(b.category))
        ) THEN 50
        ELSE 30
      END
    )::INTEGER as relevance_score
  FROM businesses b
  WHERE b.verified = true
    AND (
      LOWER(b.name) LIKE '%' || LOWER(search_query) || '%'
      OR LOWER(b.city) LIKE '%' || LOWER(search_query) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(b.category) AS cat
        WHERE LOWER(cat) LIKE '%' || LOWER(search_query) || '%'
      )
    )
  
  UNION ALL

  SELECT 
    'event'::TEXT as result_type,
    e.id,
    NULL::TEXT as name,
    e.title,
    NULL::TEXT as logo_url,
    e.cover_image_url,
    NULL::TEXT as city,
    e.location,
    e.start_at,
    e.category,
    b.name as business_name,
    NULL::BOOLEAN as verified,
    (
      CASE 
        WHEN LOWER(e.title) = LOWER(search_query) THEN 100
        WHEN LOWER(e.title) LIKE LOWER(search_query) || '%' THEN 90
        WHEN LOWER(e.title) LIKE '%' || LOWER(search_query) || '%' THEN 70
        WHEN LOWER(e.location) LIKE '%' || LOWER(search_query) || '%' THEN 60
        WHEN search_query = ANY(
          SELECT LOWER(unnest(e.category))
        ) THEN 50
        ELSE 30
      END
    )::INTEGER as relevance_score
  FROM events e
  INNER JOIN businesses b ON e.business_id = b.id
  WHERE e.end_at >= NOW()
    AND (
      LOWER(e.title) LIKE '%' || LOWER(search_query) || '%'
      OR LOWER(e.location) LIKE '%' || LOWER(search_query) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(e.category) AS cat
        WHERE LOWER(cat) LIKE '%' || LOWER(search_query) || '%'
      )
    )
  
  ORDER BY relevance_score DESC
  LIMIT 10;
END;
$function$;

-- Fix update_daily_analytics function
CREATE OR REPLACE FUNCTION public.update_daily_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_date DATE := CURRENT_DATE;
BEGIN
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
$function$;

-- Fix update_daily_analytics_realtime function
CREATE OR REPLACE FUNCTION public.update_daily_analytics_realtime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_business_id uuid;
  v_date date;
BEGIN
  IF TG_TABLE_NAME = 'event_views' THEN
    SELECT e.business_id INTO v_business_id
    FROM events e
    WHERE e.id = NEW.event_id;
    v_date := NEW.viewed_at::date;
    
  ELSIF TG_TABLE_NAME = 'discount_views' THEN
    SELECT d.business_id INTO v_business_id
    FROM discounts d
    WHERE d.id = NEW.discount_id;
    v_date := NEW.viewed_at::date;
    
  ELSIF TG_TABLE_NAME = 'business_followers' THEN
    v_business_id := NEW.business_id;
    v_date := NEW.created_at::date;
    
  ELSIF TG_TABLE_NAME = 'rsvps' THEN
    SELECT e.business_id INTO v_business_id
    FROM events e
    WHERE e.id = NEW.event_id;
    v_date := NEW.created_at::date;
    
  ELSIF TG_TABLE_NAME = 'reservations' THEN
    SELECT e.business_id INTO v_business_id
    FROM events e
    WHERE e.id = NEW.event_id;
    v_date := NEW.created_at::date;
    
  ELSIF TG_TABLE_NAME = 'redemptions' THEN
    SELECT d.business_id INTO v_business_id
    FROM discounts d
    WHERE d.id = NEW.discount_id;
    v_date := NEW.redeemed_at::date;
  END IF;

  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO daily_analytics (
    business_id,
    date,
    total_event_views,
    unique_event_viewers,
    total_discount_views,
    unique_discount_viewers,
    new_rsvps_interested,
    new_rsvps_going,
    new_reservations,
    discount_redemptions,
    new_followers,
    unfollows
  )
  VALUES (
    v_business_id,
    v_date,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT (business_id, date) 
  DO NOTHING;

  IF TG_TABLE_NAME = 'event_views' THEN
    UPDATE daily_analytics
    SET 
      total_event_views = total_event_views + 1,
      unique_event_viewers = (
        SELECT COUNT(DISTINCT user_id)
        FROM event_views ev
        JOIN events e ON e.id = ev.event_id
        WHERE e.business_id = v_business_id
          AND ev.viewed_at::date = v_date
      ),
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'discount_views' THEN
    UPDATE daily_analytics
    SET 
      total_discount_views = total_discount_views + 1,
      unique_discount_viewers = (
        SELECT COUNT(DISTINCT user_id)
        FROM discount_views dv
        JOIN discounts d ON d.id = dv.discount_id
        WHERE d.business_id = v_business_id
          AND dv.viewed_at::date = v_date
      ),
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'business_followers' THEN
    IF NEW.unfollowed_at IS NULL THEN
      UPDATE daily_analytics
      SET 
        new_followers = new_followers + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = v_date;
    ELSE
      UPDATE daily_analytics
      SET 
        unfollows = unfollows + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = NEW.unfollowed_at::date;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'rsvps' THEN
    IF NEW.status = 'interested' THEN
      UPDATE daily_analytics
      SET 
        new_rsvps_interested = new_rsvps_interested + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = v_date;
    ELSIF NEW.status = 'going' THEN
      UPDATE daily_analytics
      SET 
        new_rsvps_going = new_rsvps_going + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = v_date;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'reservations' THEN
    UPDATE daily_analytics
    SET 
      new_reservations = new_reservations + 1,
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'redemptions' THEN
    UPDATE daily_analytics
    SET 
      discount_redemptions = discount_redemptions + 1,
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
  END IF;

  RETURN NEW;
END;
$function$;