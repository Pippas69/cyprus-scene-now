-- Create RPC function for business creation with geo coordinates
CREATE OR REPLACE FUNCTION create_business_with_geo(
  p_user_id uuid,
  p_name text,
  p_category text[],
  p_city text,
  p_address text,
  p_phone text,
  p_website text,
  p_description text,
  p_logo_url text,
  p_longitude double precision,
  p_latitude double precision
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  INSERT INTO businesses (
    user_id,
    name,
    category,
    city,
    address,
    phone,
    website,
    description,
    logo_url,
    verified,
    geo
  ) VALUES (
    p_user_id,
    p_name,
    p_category,
    p_city,
    p_address,
    p_phone,
    p_website,
    p_description,
    p_logo_url,
    false,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  )
  RETURNING id INTO v_business_id;
  
  RETURN v_business_id;
END;
$$;