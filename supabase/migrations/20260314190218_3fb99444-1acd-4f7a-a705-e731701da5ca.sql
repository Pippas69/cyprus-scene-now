
ALTER TABLE public.floor_plan_tables 
ADD COLUMN IF NOT EXISTS fixture_type text DEFAULT NULL;

COMMENT ON COLUMN public.floor_plan_tables.fixture_type IS 'NULL = regular seating table, bar/dj/stage/entrance/other = non-seating fixture';

-- Make zone_id nullable so fixtures/tables can exist without a zone
ALTER TABLE public.floor_plan_tables 
ALTER COLUMN zone_id DROP NOT NULL;
