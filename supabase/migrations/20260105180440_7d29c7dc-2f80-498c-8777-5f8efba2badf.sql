-- Add pricing type columns to discounts table
ALTER TABLE public.discounts 
ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'single' CHECK (pricing_type IN ('single', 'bundle', 'itemized')),
ADD COLUMN IF NOT EXISTS bundle_price_cents integer;

-- Create discount_items table
CREATE TABLE public.discount_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id uuid NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer,
  image_url text,
  is_choice_group boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create discount_item_options table for choice groups
CREATE TABLE public.discount_item_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_item_id uuid NOT NULL REFERENCES public.discount_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.discount_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_item_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for discount_items
CREATE POLICY "Businesses can create their own discount items"
ON public.discount_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.discounts d
  JOIN public.businesses b ON d.business_id = b.id
  WHERE d.id = discount_items.discount_id AND b.user_id = auth.uid()
));

CREATE POLICY "Businesses can update their own discount items"
ON public.discount_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.discounts d
  JOIN public.businesses b ON d.business_id = b.id
  WHERE d.id = discount_items.discount_id AND b.user_id = auth.uid()
));

CREATE POLICY "Businesses can delete their own discount items"
ON public.discount_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.discounts d
  JOIN public.businesses b ON d.business_id = b.id
  WHERE d.id = discount_items.discount_id AND b.user_id = auth.uid()
));

CREATE POLICY "Anyone can view discount items for active discounts"
ON public.discount_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.discounts d
  WHERE d.id = discount_items.discount_id AND d.active = true
));

CREATE POLICY "Businesses can view their own discount items"
ON public.discount_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.discounts d
  JOIN public.businesses b ON d.business_id = b.id
  WHERE d.id = discount_items.discount_id AND b.user_id = auth.uid()
));

-- RLS policies for discount_item_options
CREATE POLICY "Businesses can create their own discount item options"
ON public.discount_item_options FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.discount_items di
  JOIN public.discounts d ON di.discount_id = d.id
  JOIN public.businesses b ON d.business_id = b.id
  WHERE di.id = discount_item_options.discount_item_id AND b.user_id = auth.uid()
));

CREATE POLICY "Businesses can update their own discount item options"
ON public.discount_item_options FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.discount_items di
  JOIN public.discounts d ON di.discount_id = d.id
  JOIN public.businesses b ON d.business_id = b.id
  WHERE di.id = discount_item_options.discount_item_id AND b.user_id = auth.uid()
));

CREATE POLICY "Businesses can delete their own discount item options"
ON public.discount_item_options FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.discount_items di
  JOIN public.discounts d ON di.discount_id = d.id
  JOIN public.businesses b ON d.business_id = b.id
  WHERE di.id = discount_item_options.discount_item_id AND b.user_id = auth.uid()
));

CREATE POLICY "Anyone can view discount item options for active discounts"
ON public.discount_item_options FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.discount_items di
  JOIN public.discounts d ON di.discount_id = d.id
  WHERE di.id = discount_item_options.discount_item_id AND d.active = true
));

CREATE POLICY "Businesses can view their own discount item options"
ON public.discount_item_options FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.discount_items di
  JOIN public.discounts d ON di.discount_id = d.id
  JOIN public.businesses b ON d.business_id = b.id
  WHERE di.id = discount_item_options.discount_item_id AND b.user_id = auth.uid()
));