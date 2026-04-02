
CREATE POLICY "Anon can view verified businesses"
ON public.businesses
FOR SELECT
TO anon
USING (verified = true);
