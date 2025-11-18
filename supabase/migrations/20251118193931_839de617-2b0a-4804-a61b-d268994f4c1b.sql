-- Fix generate_qr_token function to use extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Fully qualify the function call with the extensions schema
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;