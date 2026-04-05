-- Restore read access for verified businesses
-- The safe view hides sensitive columns, but the base table 
-- still needs to be readable for business profile pages and edge functions

CREATE POLICY "Anon can view verified businesses"
ON public.businesses
FOR SELECT
TO anon
USING (verified = true);

CREATE POLICY "Authenticated users can view verified businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (verified = true);
