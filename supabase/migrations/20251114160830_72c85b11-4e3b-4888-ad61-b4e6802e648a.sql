-- Update RLS policies to require verified businesses

-- ======= EVENTS TABLE =======
DROP POLICY IF EXISTS "Business owners can create events" ON public.events;
DROP POLICY IF EXISTS "Business owners can update their events" ON public.events;
DROP POLICY IF EXISTS "Business owners can delete their events" ON public.events;

CREATE POLICY "Verified business owners can create events" ON public.events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = events.business_id
    AND businesses.user_id = auth.uid()
    AND businesses.verified = true
  )
);

CREATE POLICY "Verified business owners can update their events" ON public.events
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = events.business_id
    AND businesses.user_id = auth.uid()
    AND businesses.verified = true
  )
);

CREATE POLICY "Verified business owners can delete their events" ON public.events
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = events.business_id
    AND businesses.user_id = auth.uid()
    AND businesses.verified = true
  )
);

-- ======= POSTS TABLE =======
DROP POLICY IF EXISTS "Business owners can create posts" ON public.posts;

CREATE POLICY "Verified business owners can create posts" ON public.posts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = posts.business_id
    AND businesses.user_id = auth.uid()
    AND businesses.verified = true
  )
);

-- ======= DISCOUNTS TABLE =======
DROP POLICY IF EXISTS "Business owners can create discounts" ON public.discounts;
DROP POLICY IF EXISTS "Business owners can update their discounts" ON public.discounts;

CREATE POLICY "Verified business owners can create discounts" ON public.discounts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = discounts.business_id
    AND businesses.user_id = auth.uid()
    AND businesses.verified = true
  )
);

CREATE POLICY "Verified business owners can update their discounts" ON public.discounts
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = discounts.business_id
    AND businesses.user_id = auth.uid()
    AND businesses.verified = true
  )
);