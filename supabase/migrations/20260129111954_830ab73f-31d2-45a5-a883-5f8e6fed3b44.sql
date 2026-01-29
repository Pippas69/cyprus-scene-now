
-- Enhanced search_content: prioritize user city/interests + subscription tier + boost
-- Keep backward compat: user_id is optional.

CREATE OR REPLACE FUNCTION public.search_content(
  search_query text,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  result_type text,
  id uuid,
  name text,
  title text,
  logo_url text,
  cover_image_url text,
  city text,
  location text,
  start_at timestamp with time zone,
  category text[],
  business_name text,
  verified boolean,
  relevance_score integer,
  business_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  search_pattern text;
  user_city text;
  user_interests text[];
BEGIN
  search_pattern := '%' || lower(search_query) || '%';

  -- Get user location and interests from profile (or preferences default_city)
  IF p_user_id IS NOT NULL THEN
    SELECT 
      COALESCE(up.default_city, pr.city, pr.town),
      pr.interests
    INTO user_city, user_interests
    FROM profiles pr
    LEFT JOIN user_preferences up ON up.user_id = pr.id
    WHERE pr.id = p_user_id;
  END IF;

  RETURN QUERY
  WITH all_results AS (
    -- Businesses: Elite > Pro > Basic > Free, then city match + interest match boosts
    SELECT
      'business'::text as r_type,
      b.id as r_id,
      b.name as r_name,
      NULL::text as r_title,
      b.logo_url as r_logo_url,
      b.cover_url as r_cover_image_url,
      b.city as r_city,
      NULL::text as r_location,
      NULL::timestamptz as r_start_at,
      b.category as r_category,
      NULL::text as r_business_name,
      b.verified as r_verified,
      NULL::uuid as r_business_id,
      -- Priority: Subscription tier
      CASE COALESCE(sp.slug, 'free')
        WHEN 'elite' THEN 0
        WHEN 'pro' THEN 1
        WHEN 'basic' THEN 2
        ELSE 5
      END as priority_rank,
      -- Relevance: text match + city bonus + interests bonus
      CASE
        WHEN lower(b.name) = lower(search_query) THEN 100
        WHEN lower(b.name) LIKE lower(search_query) || '%' THEN 90
        WHEN lower(b.name) LIKE search_pattern THEN 70
        ELSE 50
      END
      + CASE WHEN user_city IS NOT NULL AND lower(b.city) = lower(user_city) THEN 15 ELSE 0 END
      + CASE WHEN user_interests IS NOT NULL AND b.category && user_interests THEN 10 ELSE 0 END
      as r_relevance_score
    FROM businesses b
    LEFT JOIN profiles p ON b.user_id = p.id
    LEFT JOIN business_subscriptions bs ON b.id = bs.business_id AND bs.status = 'active'
    LEFT JOIN subscription_plans sp ON bs.plan_id = sp.id
    WHERE
      (lower(b.name) LIKE search_pattern OR lower(b.city) LIKE search_pattern)
      AND (p.suspended IS NULL OR p.suspended = false)

    UNION ALL

    -- Events: Boosted first, then city + interests bonus
    SELECT
      'event'::text as r_type,
      e.id as r_id,
      NULL::text as r_name,
      e.title as r_title,
      NULL::text as r_logo_url,
      e.cover_image_url as r_cover_image_url,
      b.city as r_city,
      e.location as r_location,
      e.start_at as r_start_at,
      e.category as r_category,
      b.name as r_business_name,
      b.verified as r_verified,
      e.business_id as r_business_id,
      CASE WHEN EXISTS (
        SELECT 1 FROM event_boosts eb
        WHERE eb.event_id = e.id
          AND eb.status = 'active'
          AND eb.start_date <= CURRENT_DATE
          AND eb.end_date >= CURRENT_DATE
      ) THEN 3 ELSE 6 END as priority_rank,
      CASE
        WHEN lower(e.title) = lower(search_query) THEN 100
        WHEN lower(e.title) LIKE lower(search_query) || '%' THEN 90
        WHEN lower(e.title) LIKE search_pattern THEN 70
        WHEN lower(e.location) LIKE search_pattern THEN 60
        ELSE 50
      END
      + CASE WHEN user_city IS NOT NULL AND lower(b.city) = lower(user_city) THEN 15 ELSE 0 END
      + CASE WHEN user_interests IS NOT NULL AND e.category && user_interests THEN 10 ELSE 0 END
      as r_relevance_score
    FROM events e
    JOIN businesses b ON e.business_id = b.id
    LEFT JOIN profiles p ON b.user_id = p.id
    WHERE
      (lower(e.title) LIKE search_pattern OR lower(e.location) LIKE search_pattern)
      AND e.end_at > now()
      AND b.verified = true
      AND (p.suspended IS NULL OR p.suspended = false)

    UNION ALL

    -- Offers: Boosted first, then city + interests bonus
    SELECT
      'offer'::text as r_type,
      d.id as r_id,
      NULL::text as r_name,
      d.title as r_title,
      NULL::text as r_logo_url,
      d.offer_image_url as r_cover_image_url,
      b.city as r_city,
      NULL::text as r_location,
      d.end_at as r_start_at,
      b.category as r_category,
      b.name as r_business_name,
      b.verified as r_verified,
      d.business_id as r_business_id,
      CASE WHEN EXISTS (
        SELECT 1 FROM offer_boosts ob
        WHERE ob.discount_id = d.id
          AND ob.status = 'active'
          AND ob.active = true
          AND ob.start_date <= CURRENT_DATE
          AND ob.end_date >= CURRENT_DATE
      ) THEN 4 ELSE 7 END as priority_rank,
      CASE
        WHEN lower(d.title) = lower(search_query) THEN 100
        WHEN lower(d.title) LIKE lower(search_query) || '%' THEN 90
        WHEN lower(d.title) LIKE search_pattern THEN 70
        ELSE 50
      END
      + CASE WHEN user_city IS NOT NULL AND lower(b.city) = lower(user_city) THEN 15 ELSE 0 END
      + CASE WHEN user_interests IS NOT NULL AND b.category && user_interests THEN 10 ELSE 0 END
      as r_relevance_score
    FROM discounts d
    JOIN businesses b ON d.business_id = b.id
    LEFT JOIN profiles p ON b.user_id = p.id
    WHERE
      (lower(d.title) LIKE search_pattern OR lower(b.name) LIKE search_pattern)
      AND d.active = true
      AND d.start_at <= now()
      AND d.end_at > now()
      AND b.verified = true
      AND (p.suspended IS NULL OR p.suspended = false)
  )
  SELECT
    ar.r_type,
    ar.r_id,
    ar.r_name,
    ar.r_title,
    ar.r_logo_url,
    ar.r_cover_image_url,
    ar.r_city,
    ar.r_location,
    ar.r_start_at,
    ar.r_category,
    ar.r_business_name,
    ar.r_verified,
    ar.r_relevance_score,
    ar.r_business_id
  FROM all_results ar
  ORDER BY ar.priority_rank ASC, ar.r_relevance_score DESC
  LIMIT 15;
END;
$function$;
