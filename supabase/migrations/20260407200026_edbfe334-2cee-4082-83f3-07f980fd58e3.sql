CREATE POLICY "Authenticated users can read pricing profiles"
ON public.business_pricing_profiles
FOR SELECT
TO authenticated
USING (true);