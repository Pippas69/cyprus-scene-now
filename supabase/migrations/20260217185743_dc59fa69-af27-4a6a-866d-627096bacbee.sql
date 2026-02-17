
-- Update legacy values
UPDATE public.events SET event_type = 'free' WHERE event_type IS NULL OR event_type = 'free_entry';

-- Add new constraint with all allowed values
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check 
  CHECK (event_type IN ('free', 'free_entry', 'ticket', 'reservation', 'ticket_and_reservation'));
