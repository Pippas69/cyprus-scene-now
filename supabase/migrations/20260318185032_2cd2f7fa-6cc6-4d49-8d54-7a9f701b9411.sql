
-- Table to assign reservations to specific floor plan tables
CREATE TABLE public.reservation_table_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.floor_plan_tables(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(table_id),
  UNIQUE(reservation_id)
);

-- Enable RLS
ALTER TABLE public.reservation_table_assignments ENABLE ROW LEVEL SECURITY;

-- Business owners can manage assignments for their tables
CREATE POLICY "Business owners can manage table assignments"
ON public.reservation_table_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_tables fpt
    JOIN public.businesses b ON b.id = fpt.business_id
    WHERE fpt.id = reservation_table_assignments.table_id
    AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.floor_plan_tables fpt
    JOIN public.businesses b ON b.id = fpt.business_id
    WHERE fpt.id = reservation_table_assignments.table_id
    AND b.user_id = auth.uid()
  )
);
