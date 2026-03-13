
-- Floor plan zones table: defines clickable areas on the venue layout
CREATE TABLE public.floor_plan_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL,
  zone_type text NOT NULL DEFAULT 'table', -- table, vip, bar, stage, dj, other
  shape text NOT NULL DEFAULT 'rect', -- rect, circle
  x_percent numeric NOT NULL, -- position as % of image width (0-100)
  y_percent numeric NOT NULL,
  width_percent numeric NOT NULL DEFAULT 5,
  height_percent numeric NOT NULL DEFAULT 5,
  capacity integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Link reservations to floor plan zones
CREATE TABLE public.reservation_zone_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.floor_plan_zones(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(reservation_id)
);

-- Add floor_plan_image_url to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS floor_plan_image_url text;

-- RLS
ALTER TABLE public.floor_plan_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_zone_assignments ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their own floor plan zones
CREATE POLICY "Business owners manage floor plan zones"
  ON public.floor_plan_zones FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Business owners can manage zone assignments for their reservations
CREATE POLICY "Business owners manage zone assignments"
  ON public.reservation_zone_assignments FOR ALL
  TO authenticated
  USING (
    zone_id IN (
      SELECT fpz.id FROM public.floor_plan_zones fpz
      JOIN public.businesses b ON b.id = fpz.business_id
      WHERE b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    zone_id IN (
      SELECT fpz.id FROM public.floor_plan_zones fpz
      JOIN public.businesses b ON b.id = fpz.business_id
      WHERE b.user_id = auth.uid()
    )
  );

-- Storage bucket for floor plan images
INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: business owners can upload their floor plans
CREATE POLICY "Business owners upload floor plans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'floor-plans' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Business owners manage floor plan files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'floor-plans' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public read floor plan images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'floor-plans');
