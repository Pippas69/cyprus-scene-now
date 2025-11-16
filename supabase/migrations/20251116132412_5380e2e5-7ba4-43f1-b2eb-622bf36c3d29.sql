-- Add confirmation fields to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS qr_code_token TEXT;

-- Create function to generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  code VARCHAR(6);
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 6-digit random code
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check
    FROM reservations
    WHERE confirmation_code = code;
    
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate QR token
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate confirmation code and QR token
CREATE OR REPLACE FUNCTION set_reservation_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := generate_confirmation_code();
  END IF;
  
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := generate_qr_token();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservation_confirmation_trigger ON public.reservations;
CREATE TRIGGER reservation_confirmation_trigger
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION set_reservation_confirmation();

-- Create function to check available capacity for an event
CREATE OR REPLACE FUNCTION get_available_capacity(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  max_cap INTEGER;
  current_count INTEGER;
BEGIN
  -- Get max reservations for the event
  SELECT max_reservations INTO max_cap
  FROM events
  WHERE id = p_event_id;
  
  -- If no limit, return a large number
  IF max_cap IS NULL THEN
    RETURN 999999;
  END IF;
  
  -- Count accepted and pending reservations
  SELECT COALESCE(SUM(party_size), 0) INTO current_count
  FROM reservations
  WHERE event_id = p_event_id
  AND status IN ('pending', 'accepted');
  
  -- Return available capacity
  RETURN GREATEST(0, max_cap - current_count);
END;
$$ LANGUAGE plpgsql;

-- Create function to validate reservation capacity
CREATE OR REPLACE FUNCTION validate_reservation_capacity()
RETURNS TRIGGER AS $$
DECLARE
  available_cap INTEGER;
BEGIN
  -- Only check for new reservations or when party size changes
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.party_size != OLD.party_size)) 
     AND NEW.status IN ('pending', 'accepted') THEN
    
    available_cap := get_available_capacity(NEW.event_id);
    
    IF available_cap < NEW.party_size THEN
      RAISE EXCEPTION 'Not enough capacity. Available slots: %', available_cap;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_reservation_capacity ON public.reservations;
CREATE TRIGGER check_reservation_capacity
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION validate_reservation_capacity();

-- Add index for faster capacity queries
CREATE INDEX IF NOT EXISTS idx_reservations_event_status 
ON public.reservations(event_id, status) 
WHERE status IN ('pending', 'accepted');