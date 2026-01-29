-- Update search priority: Businesses (Elite→Pro→Basic) first, then Boosted events/offers, then non-boosted, then Free businesses

CREATE OR REPLACE FUNCTION public.search_content(search_query text)
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
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    -- Businesses
    SELECT
      'business'::text AS result_type,
      b.id,
      b.name,
      NULL::text AS title,
      b.logo_url,
      NULL::text AS cover_image_url,
      b.city,
      NULL::text AS location,
      NULL::timestamptz AS start_at,
      b.category,
      NULL::text AS business_name,
      b.verified,
      (
        CASE
          WHEN LOWER(b.name) = LOWER(search_query) THEN 100
          WHEN LOWER(b.name) LIKE LOWER(search_query) || '%' THEN 90
          WHEN LOWER(b.name) LIKE '%' || LOWER(search_query) || '%' THEN 70
          WHEN LOWER(b.city) = LOWER(search_query) THEN 60
          WHEN EXISTS (
            SELECT 1 FROM unnest(b.category) AS cat
            WHERE LOWER(cat) = LOWER(search_query)
          ) THEN 50
          ELSE 30
        END
      )::integer AS relevance_score,
      NULL::uuid AS business_id,
      -- sorting helpers: businesses with paid plans get priority 0-2, free gets 5
      (
        CASE COALESCE(sp.slug, 'free')
          WHEN 'elite' THEN 0
          WHEN 'pro' THEN 1
          WHEN 'basic' THEN 2
          ELSE 5  -- Free businesses come after boosted events/offers
        END
      )::integer AS priority_rank
    FROM businesses b
    INNER JOIN profiles p ON p.id = b.user_id
    LEFT JOIN business_subscriptions bs
      ON bs.business_id = b.id
     AND bs.status = 'active'
     AND bs.current_period_end > now()
    LEFT JOIN subscription_plans sp ON sp.id = bs.plan_id
    WHERE b.verified = true
      AND COALESCE(b.onboarding_completed, false) = true
      AND COALESCE(p.suspended, false) = false
      AND (
        LOWER(b.name) LIKE '%' || LOWER(search_query) || '%'
        OR LOWER(b.city) LIKE '%' || LOWER(search_query) || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(b.category) AS cat
          WHERE LOWER(cat) LIKE '%' || LOWER(search_query) || '%'
        )
      )

    UNION ALL

    -- Events (exclude expired)
    SELECT
      'event'::text AS result_type,
      e.id,
      NULL::text AS name,
      e.title,
      NULL::text AS logo_url,
      e.cover_image_url,
      NULL::text AS city,
      e.location,
      e.start_at,
      e.category,
      bus.name AS business_name,
      NULL::boolean AS verified,
      (
        CASE
          WHEN LOWER(e.title) = LOWER(search_query) THEN 100
          WHEN LOWER(e.title) LIKE LOWER(search_query) || '%' THEN 90
          WHEN LOWER(e.title) LIKE '%' || LOWER(search_query) || '%' THEN 70
          WHEN LOWER(e.location) LIKE '%' || LOWER(search_query) || '%' THEN 60
          WHEN EXISTS (
            SELECT 1 FROM unnest(e.category) AS cat
            WHERE LOWER(cat) = LOWER(search_query)
          ) THEN 50
          ELSE 30
        END
      )::integer AS relevance_score,
      e.business_id AS business_id,
      -- Boosted events get priority 3, non-boosted get 6
      (CASE WHEN eb.id IS NOT NULL THEN 3 ELSE 6 END)::integer AS priority_rank
    FROM events e
    INNER JOIN businesses bus ON e.business_id = bus.id
    INNER JOIN profiles p2 ON p2.id = bus.user_id
    LEFT JOIN event_boosts eb
      ON eb.event_id = e.id
     AND eb.status = 'active'
     AND current_date >= eb.start_date
     AND current_date <= eb.end_date
    WHERE e.end_at > now()
      AND bus.verified = true
      AND COALESCE(bus.onboarding_completed, false) = true
      AND COALESCE(p2.suspended, false) = false
      AND (
        LOWER(e.title) LIKE '%' || LOWER(search_query) || '%'
        OR LOWER(e.location) LIKE '%' || LOWER(search_query) || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(e.category) AS cat
          WHERE LOWER(cat) LIKE '%' || LOWER(search_query) || '%'
        )
      )

    UNION ALL

    -- Offers/Discounts (exclude expired/inactive/not-started)
    SELECT
      'offer'::text AS result_type,
      d.id,
      NULL::text AS name,
      d.title,
      NULL::text AS logo_url,
      COALESCE(d.offer_image_url, bus2.logo_url) AS cover_image_url,
      bus2.city,
      NULL::text AS location,
      d.end_at AS start_at,
      ARRAY[d.category]::text[] AS category,
      bus2.name AS business_name,
      NULL::boolean AS verified,
      (
        CASE
          WHEN LOWER(d.title) = LOWER(search_query) THEN 100
          WHEN LOWER(d.title) LIKE LOWER(search_query) || '%' THEN 90
          WHEN LOWER(d.title) LIKE '%' || LOWER(search_query) || '%' THEN 70
          WHEN LOWER(bus2.name) LIKE '%' || LOWER(search_query) || '%' THEN 60
          ELSE 30
        END
      )::integer AS relevance_score,
      d.business_id AS business_id,
      -- Boosted offers get priority 4, non-boosted get 7
      (CASE WHEN ob.id IS NOT NULL THEN 4 ELSE 7 END)::integer AS priority_rank
    FROM discounts d
    INNER JOIN businesses bus2 ON d.business_id = bus2.id
    INNER JOIN profiles p3 ON p3.id = bus2.user_id
    LEFT JOIN offer_boosts ob
      ON ob.discount_id = d.id
     AND ob.status = 'active'
     AND current_date >= ob.start_date
     AND current_date <= ob.end_date
    WHERE d.active = true
      AND d.start_at <= now()
      AND d.end_at > now()
      AND bus2.verified = true
      AND COALESCE(bus2.onboarding_completed, false) = true
      AND COALESCE(p3.suspended, false) = false
      AND (
        LOWER(d.title) LIKE '%' || LOWER(search_query) || '%'
        OR LOWER(bus2.name) LIKE '%' || LOWER(search_query) || '%'
      )
  )
  SELECT
    b.result_type,
    b.id,
    b.name,
    b.title,
    b.logo_url,
    b.cover_image_url,
    b.city,
    b.location,
    b.start_at,
    b.category,
    b.business_name,
    b.verified,
    b.relevance_score,
    b.business_id
  FROM base b
  ORDER BY
    b.priority_rank ASC,
    b.relevance_score DESC
  LIMIT 15;
END;
$$;

-- Priority order:
-- 0: Elite businesses
-- 1: Pro businesses
-- 2: Basic businesses
-- 3: Boosted events
-- 4: Boosted offers
-- 5: Free businesses
-- 6: Non-boosted events
-- 7: Non-boosted offers