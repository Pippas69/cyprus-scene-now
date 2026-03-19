
-- Add event_id column to reservation_table_assignments to scope assignments per event
ALTER TABLE public.reservation_table_assignments
ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- Drop old unique constraint on table_id (one table can be used in multiple events)
ALTER TABLE public.reservation_table_assignments
DROP CONSTRAINT IF EXISTS reservation_table_assignments_table_id_key;

-- Create new unique constraint: one table per event
ALTER TABLE public.reservation_table_assignments
ADD CONSTRAINT reservation_table_assignments_table_event_unique UNIQUE (table_id, event_id);

-- Create index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_reservation_table_assignments_event_id ON public.reservation_table_assignments(event_id);
