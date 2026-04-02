DROP POLICY IF EXISTS "Business owners can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update offer images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete offer images" ON storage.objects;

CREATE POLICY "Business owners can upload offer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update offer images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete offer images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  )
);