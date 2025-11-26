-- Fix business_followers RLS policy to prevent exposure of all follower relationships
DROP POLICY IF EXISTS "Users can view all followers" ON business_followers;

-- Users can see their own follows
CREATE POLICY "Users can view their own follows" ON business_followers
FOR SELECT USING (auth.uid() = user_id);

-- Business owners can see their followers
CREATE POLICY "Business owners can see their followers" ON business_followers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = business_followers.business_id 
    AND businesses.user_id = auth.uid()
  )
);