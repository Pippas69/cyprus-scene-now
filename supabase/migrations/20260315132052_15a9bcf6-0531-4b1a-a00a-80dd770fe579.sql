
ALTER TABLE public.floor_plan_tables 
  ADD COLUMN IF NOT EXISTS rotation integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS width_percent numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS height_percent numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'table';

ALTER TABLE public.floor_plan_zones 
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#00E5FF';
