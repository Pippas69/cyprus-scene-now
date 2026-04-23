CREATE OR REPLACE FUNCTION public.generate_booking_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  token TEXT;
  i INTEGER;
  rand_bytes BYTEA;
  attempts INTEGER := 0;
BEGIN
  LOOP
    token := '';
    rand_bytes := extensions.gen_random_bytes(16);
    FOR i IN 0..15 LOOP
      token := token || substr(alphabet, (get_byte(rand_bytes, i) % length(alphabet)) + 1, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.pending_bookings WHERE pending_bookings.token = token) THEN
      RETURN token;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique token after 10 attempts';
    END IF;
  END LOOP;
END;
$$;