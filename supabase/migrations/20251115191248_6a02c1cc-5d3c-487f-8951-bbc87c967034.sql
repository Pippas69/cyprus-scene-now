-- Create a function to get business coordinates for given business IDs
CREATE OR REPLACE FUNCTION get_business_coordinates(business_ids uuid[])
RETURNS TABLE (
  business_id uuid,
  longitude double precision,
  latitude double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id as business_id,
    ST_X(geo::geometry) as longitude,
    ST_Y(geo::geometry) as latitude
  FROM businesses
  WHERE id = ANY(business_ids)
    AND geo IS NOT NULL;
$$;