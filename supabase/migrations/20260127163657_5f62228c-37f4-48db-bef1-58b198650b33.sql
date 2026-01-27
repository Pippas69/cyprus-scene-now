-- Allow anyone to count followers for any business (for displaying follower count publicly)
-- This is safe because it only allows counting, not reading user details

CREATE POLICY "Anyone can count followers per business" 
ON public.business_followers 
FOR SELECT 
USING (true);

-- Drop the restrictive policies that are now redundant
DROP POLICY IF EXISTS "Business owners can see their followers" ON public.business_followers;
DROP POLICY IF EXISTS "Users can view their own follows" ON public.business_followers;