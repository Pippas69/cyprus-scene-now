
CREATE TABLE public.floor_plan_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.floor_plan_zones(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  x_percent NUMERIC NOT NULL DEFAULT 50,
  y_percent NUMERIC NOT NULL DEFAULT 50,
  seats INTEGER NOT NULL DEFAULT 4,
  shape TEXT NOT NULL DEFAULT 'round',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.floor_plan_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage floor plan tables"
ON public.floor_plan_tables
FOR ALL
TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
