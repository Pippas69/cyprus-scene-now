-- Remove public read access from floor-plan-references
DROP POLICY IF EXISTS "Public read access for floor plan references" ON storage.objects;

-- Remove public read access from floor-plans
DROP POLICY IF EXISTS "Public read floor plan images" ON storage.objects;

-- Add owner-only read for floor-plans bucket (matches existing pattern for references)
CREATE POLICY "Business owners can view floor plans"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'floor-plans'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE user_id = auth.uid()
  )
);
