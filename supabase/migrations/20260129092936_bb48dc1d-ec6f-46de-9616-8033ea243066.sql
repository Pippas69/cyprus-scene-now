-- Drop and recreate search_content with business_id column
DROP FUNCTION IF EXISTS public.search_content(TEXT);

CREATE FUNCTION public.search_content(search_query TEXT)
RETURNS TABLE (
  result_type TEXT,
  id UUID,
  name TEXT,
  title TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  city TEXT,
  location TEXT,
  start_at TIMESTAMPTZ,
  category TEXT[],
  business_name TEXT,
  verified BOOLEAN,
  relevance_score INTEGER,
  business_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Businesses
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
    )::INTEGER as relevance_score,
    NULL::UUID as business_id
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

  -- Events
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
    bus.name as business_name,
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
    )::INTEGER as relevance_score,
    e.business_id as business_id
  FROM events e
  INNER JOIN businesses bus ON e.business_id = bus.id
  WHERE e.end_at >= NOW()
    AND (
      LOWER(e.title) LIKE '%' || LOWER(search_query) || '%'
      OR LOWER(e.location) LIKE '%' || LOWER(search_query) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(e.category) AS cat
        WHERE LOWER(cat) LIKE '%' || LOWER(search_query) || '%'
      )
    )
  
  UNION ALL

  -- Offers/Discounts
  SELECT 
    'offer'::TEXT as result_type,
    d.id,
    NULL::TEXT as name,
    d.title,
    NULL::TEXT as logo_url,
    COALESCE(d.offer_image_url, bus2.logo_url) as cover_image_url,
    bus2.city,
    NULL::TEXT as location,
    d.end_at as start_at,
    ARRAY[d.category]::TEXT[] as category,
    bus2.name as business_name,
    NULL::BOOLEAN as verified,
    (
      CASE 
        WHEN LOWER(d.title) = LOWER(search_query) THEN 100
        WHEN LOWER(d.title) LIKE LOWER(search_query) || '%' THEN 90
        WHEN LOWER(d.title) LIKE '%' || LOWER(search_query) || '%' THEN 70
        WHEN LOWER(bus2.name) LIKE '%' || LOWER(search_query) || '%' THEN 60
        ELSE 30
      END
    )::INTEGER as relevance_score,
    d.business_id as business_id
  FROM discounts d
  INNER JOIN businesses bus2 ON d.business_id = bus2.id
  WHERE d.active = true
    AND d.end_at >= NOW()
    AND d.start_at <= NOW()
    AND (
      LOWER(d.title) LIKE '%' || LOWER(search_query) || '%'
      OR LOWER(bus2.name) LIKE '%' || LOWER(search_query) || '%'
    )
  
  ORDER BY relevance_score DESC
  LIMIT 15;
END;
$$;