
-- Helper function to check if a business is a performance category
CREATE OR REPLACE FUNCTION public.is_performance_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id
    AND category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  );
$$;

-- Drop existing permissive policies and re-create with category check

-- PRODUCTIONS: only performance businesses can manage
DROP POLICY IF EXISTS "Businesses can manage own productions" ON public.productions;
CREATE POLICY "Performance businesses can manage own productions"
ON public.productions
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.businesses 
    WHERE user_id = auth.uid()
    AND category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses 
    WHERE user_id = auth.uid()
    AND category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
);

-- PRODUCTION_CAST: only performance businesses
DROP POLICY IF EXISTS "Businesses can manage cast" ON public.production_cast;
CREATE POLICY "Performance businesses can manage cast"
ON public.production_cast
FOR ALL
TO authenticated
USING (
  production_id IN (
    SELECT p.id FROM public.productions p
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
)
WITH CHECK (
  production_id IN (
    SELECT p.id FROM public.productions p
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
);

-- SHOW_INSTANCES: only performance businesses can manage
DROP POLICY IF EXISTS "Businesses can manage show instances" ON public.show_instances;
CREATE POLICY "Performance businesses can manage show instances"
ON public.show_instances
FOR ALL
TO authenticated
USING (
  production_id IN (
    SELECT p.id FROM public.productions p
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
)
WITH CHECK (
  production_id IN (
    SELECT p.id FROM public.productions p
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
);

-- SHOW_ZONE_PRICING: only performance businesses can manage
DROP POLICY IF EXISTS "Businesses can manage zone pricing" ON public.show_zone_pricing;
CREATE POLICY "Performance businesses can manage zone pricing"
ON public.show_zone_pricing
FOR ALL
TO authenticated
USING (
  show_instance_id IN (
    SELECT si.id FROM public.show_instances si
    JOIN public.productions p ON p.id = si.production_id
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
)
WITH CHECK (
  show_instance_id IN (
    SELECT si.id FROM public.show_instances si
    JOIN public.productions p ON p.id = si.production_id
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
);

-- SHOW_INSTANCE_SEATS: only performance businesses can manage
DROP POLICY IF EXISTS "Businesses can manage show seats" ON public.show_instance_seats;
CREATE POLICY "Performance businesses can manage show seats"
ON public.show_instance_seats
FOR ALL
TO authenticated
USING (
  show_instance_id IN (
    SELECT si.id FROM public.show_instances si
    JOIN public.productions p ON p.id = si.production_id
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
)
WITH CHECK (
  show_instance_id IN (
    SELECT si.id FROM public.show_instances si
    JOIN public.productions p ON p.id = si.production_id
    JOIN public.businesses b ON b.id = p.business_id
    WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['Theatre', 'Music', 'Dance', 'Kids', 'Θέατρο', 'Μουσική', 'Χορός', 'Παιδικά']
  )
);

-- Public read policies remain unchanged (anyone can view shows/venues)
