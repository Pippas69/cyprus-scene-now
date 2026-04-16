
-- Floor plan templates (master layouts)
CREATE TABLE public.floor_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  reference_image_url TEXT,
  screenshot_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.floor_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their templates"
  ON public.floor_plan_templates FOR ALL
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE INDEX idx_floor_plan_templates_business ON public.floor_plan_templates(business_id);

-- Event floor plans (independent snapshots per event)
CREATE TABLE public.event_floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.floor_plan_templates(id) ON DELETE SET NULL,
  layout_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  reference_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

ALTER TABLE public.event_floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their event floor plans"
  ON public.event_floor_plans FOR ALL
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE INDEX idx_event_floor_plans_event ON public.event_floor_plans(event_id);
CREATE INDEX idx_event_floor_plans_business ON public.event_floor_plans(business_id);

-- Auto-update timestamps
CREATE TRIGGER update_floor_plan_templates_updated_at
  BEFORE UPDATE ON public.floor_plan_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_floor_plans_updated_at
  BEFORE UPDATE ON public.event_floor_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
