-- Fix security warning: Set search_path for the update_business_with_geo function
DROP FUNCTION IF EXISTS update_business_with_geo(uuid, text, text, text, text, text, text, text[], text, text, double precision, double precision);

CREATE OR REPLACE FUNCTION update_business_with_geo(
  p_business_id uuid,
  p_name text,
  p_description text,
  p_phone text,
  p_website text,
  p_address text,
  p_city text,
  p_category text[],
  p_logo_url text,
  p_cover_url text,
  p_longitude double precision,
  p_latitude double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE businesses
  SET
    name = p_name,
    description = p_description,
    phone = p_phone,
    website = p_website,
    address = p_address,
    city = p_city,
    category = p_category,
    logo_url = p_logo_url,
    cover_url = p_cover_url,
    geo = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    updated_at = now()
  WHERE id = p_business_id;
END;
$$;