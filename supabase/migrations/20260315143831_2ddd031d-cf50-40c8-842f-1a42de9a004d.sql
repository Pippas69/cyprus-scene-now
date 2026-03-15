
-- Create rooms table for multi-floor/room support
CREATE TABLE public.floor_plan_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Main floor',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.floor_plan_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their rooms" ON public.floor_plan_rooms
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Add room_id to floor_plan_tables
ALTER TABLE public.floor_plan_tables 
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.floor_plan_rooms(id) ON DELETE SET NULL;

-- Add combined_with for table linking
ALTER TABLE public.floor_plan_tables 
  ADD COLUMN IF NOT EXISTS combined_with uuid[] DEFAULT '{}';

-- Add section_label for section grouping
ALTER TABLE public.floor_plan_tables 
  ADD COLUMN IF NOT EXISTS section_label text;
