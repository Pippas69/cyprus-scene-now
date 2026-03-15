
-- RLS: only business owner can manage their reference images
CREATE POLICY "Business owners can upload floor plan references"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'floor-plan-references'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.user_id = auth.uid()
    AND businesses.id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Business owners can view floor plan references"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'floor-plan-references'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.user_id = auth.uid()
    AND businesses.id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Business owners can delete floor plan references"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'floor-plan-references'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.user_id = auth.uid()
    AND businesses.id = (storage.foldername(name))[1]::uuid
  )
);
