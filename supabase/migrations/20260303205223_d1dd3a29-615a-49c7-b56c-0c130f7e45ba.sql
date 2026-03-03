
-- Add seat info and ticket code to tickets table
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS venue_seat_id UUID REFERENCES public.venue_seats(id),
  ADD COLUMN IF NOT EXISTS seat_zone TEXT,
  ADD COLUMN IF NOT EXISTS seat_row TEXT,
  ADD COLUMN IF NOT EXISTS seat_number INTEGER,
  ADD COLUMN IF NOT EXISTS ticket_code TEXT;

-- Generate short ticket codes for existing tickets that don't have one
UPDATE public.tickets
SET ticket_code = UPPER(SUBSTRING(id::text FROM 1 FOR 4) || '-' || SUBSTRING(qr_code_token FROM 1 FOR 4))
WHERE ticket_code IS NULL;

-- Create a function to auto-generate ticket_code on insert
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_code IS NULL THEN
    NEW.ticket_code := UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 4) || '-' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_generate_ticket_code ON public.tickets;
CREATE TRIGGER trg_generate_ticket_code
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_code();
