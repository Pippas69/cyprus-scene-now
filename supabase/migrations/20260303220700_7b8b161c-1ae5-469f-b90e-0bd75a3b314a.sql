-- Fix category-based RLS policies to include lowercase canonical categories

-- Drop old category-based policies that only check capitalized values
DROP POLICY IF EXISTS "Performance businesses can manage own productions" ON public.productions;
DROP POLICY IF EXISTS "Performance businesses can manage cast" ON public.production_cast;
DROP POLICY IF EXISTS "Performance businesses can manage show instances" ON public.show_instances;
DROP POLICY IF EXISTS "Performance businesses can manage zone pricing" ON public.show_zone_pricing;

-- Recreate with lowercase canonical categories included
CREATE POLICY "Performance businesses can manage own productions"
ON public.productions FOR ALL TO authenticated
USING (business_id IN (
  SELECT id FROM businesses
  WHERE user_id = auth.uid()
    AND category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
))
WITH CHECK (business_id IN (
  SELECT id FROM businesses
  WHERE user_id = auth.uid()
    AND category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
));

CREATE POLICY "Performance businesses can manage cast"
ON public.production_cast FOR ALL TO authenticated
USING (production_id IN (
  SELECT p.id FROM productions p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
))
WITH CHECK (production_id IN (
  SELECT p.id FROM productions p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
));

CREATE POLICY "Performance businesses can manage show instances"
ON public.show_instances FOR ALL TO authenticated
USING (production_id IN (
  SELECT p.id FROM productions p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
))
WITH CHECK (production_id IN (
  SELECT p.id FROM productions p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
));

CREATE POLICY "Performance businesses can manage zone pricing"
ON public.show_zone_pricing FOR ALL TO authenticated
USING (show_instance_id IN (
  SELECT si.id FROM show_instances si
  JOIN productions p ON p.id = si.production_id
  JOIN businesses b ON b.id = p.business_id
  WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
))
WITH CHECK (show_instance_id IN (
  SELECT si.id FROM show_instances si
  JOIN productions p ON p.id = si.production_id
  JOIN businesses b ON b.id = p.business_id
  WHERE b.user_id = auth.uid()
    AND b.category && ARRAY['theatre','music','dance','kids','Theatre','Music','Dance','Kids','Θέατρο','Μουσική','Χορός','Παιδικά']
));