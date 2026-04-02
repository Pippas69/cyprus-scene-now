
-- 1. Fix business_subscriptions: Remove public SELECT policy that exposes Stripe data
DROP POLICY IF EXISTS "Anyone can view subscriptions for verified businesses" ON public.business_subscriptions;

CREATE OR REPLACE VIEW public.public_business_subscriptions
WITH (security_invoker = on) AS
SELECT 
  bs.business_id,
  sp.slug as plan_slug,
  sp.name as plan_name,
  bs.status,
  bs.beta_tester
FROM public.business_subscriptions bs
LEFT JOIN public.subscription_plans sp ON bs.plan_id = sp.id
WHERE EXISTS (
  SELECT 1 FROM public.businesses b 
  WHERE b.id = bs.business_id AND b.verified = true
);

-- 2. Fix webhook_events_processed: restrict to service_role only
DROP POLICY IF EXISTS "Service role full access" ON public.webhook_events_processed;

CREATE POLICY "Service role only access"
ON public.webhook_events_processed
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Fix businesses table: remove anon direct access (use public_businesses view)
DROP POLICY IF EXISTS "Anon can view verified businesses via limited columns" ON public.businesses;

-- 4. Fix SECURITY DEFINER functions without search_path
ALTER FUNCTION public.delete_email SET search_path = public;
ALTER FUNCTION public.enqueue_email SET search_path = public;
ALTER FUNCTION public.merge_ghost_crm_profiles SET search_path = public;
ALTER FUNCTION public.move_to_dlq SET search_path = public;
ALTER FUNCTION public.read_email_batch SET search_path = public;

-- 5. Fix storage: offer-images policies with path-based ownership
DROP POLICY IF EXISTS "Business owners can delete offer images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update offer images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can upload offer images" ON storage.objects;

CREATE POLICY "Business owners can upload offer images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'offer-images' 
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.user_id = auth.uid() 
    AND businesses.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners can update offer images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'offer-images' 
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.user_id = auth.uid() 
    AND businesses.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners can delete offer images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'offer-images' 
  AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.user_id = auth.uid() 
    AND businesses.id::text = (storage.foldername(name))[1]
  )
);

-- 6. Fix storage: business-covers upload with ownership
DROP POLICY IF EXISTS "Authenticated users can upload business covers" ON storage.objects;

CREATE POLICY "Business owners can upload business covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. Fix storage: event-covers - remove generic upload, keep verified business policy
DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
