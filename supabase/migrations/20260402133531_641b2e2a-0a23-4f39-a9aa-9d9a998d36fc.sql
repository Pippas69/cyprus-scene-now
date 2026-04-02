DROP POLICY IF EXISTS "Business owners can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update offer images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete offer images" ON storage.objects;

CREATE POLICY "Business owners can upload offer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.user_id = auth.uid()
      AND businesses.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners can update offer images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.user_id = auth.uid()
      AND businesses.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.user_id = auth.uid()
      AND businesses.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners can delete offer images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.user_id = auth.uid()
      AND businesses.id::text = (storage.foldername(name))[1]
  )
);