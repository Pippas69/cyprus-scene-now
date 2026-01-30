
-- Function to get personalized similar events
-- Priority: 1) Boosted events matching user profile, 2) Non-boosted matching events
-- Filters by: category overlap, user interests, user city proximity
-- Limit: 2 events max
CREATE OR REPLACE FUNCTION public.get_similar_events(
  p_event_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 2
)
RETURNS TABLE (
  id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  cover_image_url text,
  category text[],
  price_tier text,
  event_type text,
  business_id uuid,
  business_name text,
  business_logo_url text,
  business_verified boolean,
  business_city text,
  is_boosted boolean,
  interested_count bigint,
  going_count bigint,
  similarity_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_category text[];
  v_event_location text;
  v_user_interests text[];
  v_user_city text;
BEGIN
  -- Get the source event's category and location
  SELECT e.category, e.location INTO v_event_category, v_event_location
  FROM events e
  WHERE e.id = p_event_id;

  -- Get user profile info if logged in
  IF p_user_id IS NOT NULL THEN
    SELECT p.interests, p.city INTO v_user_interests, v_user_city
    FROM profiles p
    WHERE p.id = p_user_id;
  END IF;

  RETURN QUERY
  WITH boosted_events AS (
    -- Get currently active boosted event IDs
    SELECT eb.event_id
    FROM event_boosts eb
    WHERE eb.status = 'active'
      AND eb.start_date <= NOW()
      AND eb.end_date >= NOW()
  ),
  event_rsvp_counts AS (
    -- Pre-calculate RSVP counts
    SELECT 
      r.event_id,
      COUNT(*) FILTER (WHERE r.status = 'interested') AS interested_count,
      COUNT(*) FILTER (WHERE r.status = 'going') AS going_count
    FROM rsvps r
    GROUP BY r.event_id
  ),
  scored_events AS (
    SELECT 
      e.id,
      e.title,
      e.start_at,
      e.end_at,
      e.location,
      e.cover_image_url,
      e.category,
      e.price_tier::text,
      e.event_type,
      b.id AS business_id,
      b.name AS business_name,
      b.logo_url AS business_logo_url,
      b.verified AS business_verified,
      b.city AS business_city,
      (be.event_id IS NOT NULL) AS is_boosted,
      COALESCE(rc.interested_count, 0) AS interested_count,
      COALESCE(rc.going_count, 0) AS going_count,
      -- Calculate similarity score
      (
        -- Boosted events get highest priority (+100)
        CASE WHEN be.event_id IS NOT NULL THEN 100 ELSE 0 END
        -- Category overlap with source event (+30)
        + CASE WHEN e.category && v_event_category THEN 30 ELSE 0 END
        -- User interest match (+20)
        + CASE WHEN v_user_interests IS NOT NULL AND e.category && v_user_interests THEN 20 ELSE 0 END
        -- User city match (+15)
        + CASE WHEN v_user_city IS NOT NULL AND b.city = v_user_city THEN 15 ELSE 0 END
        -- Same location as source event (+10)
        + CASE WHEN e.location ILIKE '%' || v_event_location || '%' OR v_event_location ILIKE '%' || e.location || '%' THEN 10 ELSE 0 END
        -- Upcoming events get small boost (+5)
        + CASE WHEN e.start_at <= NOW() + INTERVAL '7 days' THEN 5 ELSE 0 END
      ) AS similarity_score
    FROM events e
    INNER JOIN businesses b ON b.id = e.business_id
    LEFT JOIN boosted_events be ON be.event_id = e.id
    LEFT JOIN event_rsvp_counts rc ON rc.event_id = e.id
    WHERE e.id != p_event_id
      AND e.end_at >= NOW()  -- Only future/ongoing events
      -- Must have at least some relevance (category overlap with source OR user interests)
      AND (
        e.category && v_event_category
        OR (v_user_interests IS NOT NULL AND e.category && v_user_interests)
      )
  )
  SELECT 
    se.id,
    se.title,
    se.start_at,
    se.end_at,
    se.location,
    se.cover_image_url,
    se.category,
    se.price_tier,
    se.event_type,
    se.business_id,
    se.business_name,
    se.business_logo_url,
    se.business_verified,
    se.business_city,
    se.is_boosted,
    se.interested_count,
    se.going_count,
    se.similarity_score
  FROM scored_events se
  ORDER BY se.similarity_score DESC, se.start_at ASC
  LIMIT p_limit;
END;
$$;
