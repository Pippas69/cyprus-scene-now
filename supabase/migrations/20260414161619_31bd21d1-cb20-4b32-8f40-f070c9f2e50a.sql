-- Add back SELECT policy for authenticated users to read verified businesses
-- This is needed for BusinessProfile, event/offer joins, and map functionality
CREATE POLICY "Authenticated users can view verified businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (verified = true);

-- Also allow anon users to view verified businesses (for public pages)
CREATE POLICY "Anon users can view verified businesses"
ON public.businesses
FOR SELECT
TO anon
USING (verified = true);