-- Create business_followers table for follow feature
CREATE TABLE IF NOT EXISTS public.business_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS
ALTER TABLE public.business_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all followers"
  ON public.business_followers FOR SELECT
  USING (true);

CREATE POLICY "Users can follow businesses"
  ON public.business_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow businesses"
  ON public.business_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_business_followers_business_id ON public.business_followers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_followers_user_id ON public.business_followers(user_id);

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_business_follower_count(business_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM business_followers
    WHERE business_id = business_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced search function with relevance scoring
CREATE OR REPLACE FUNCTION search_content(search_query TEXT)
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
  relevance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- Search businesses with relevance scoring
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

  -- Search events with relevance scoring
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
$$ LANGUAGE plpgsql SECURITY DEFINER;