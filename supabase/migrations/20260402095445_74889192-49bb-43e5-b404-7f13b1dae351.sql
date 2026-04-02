
-- 1. Fix audit_trail: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert audit trail" ON public.audit_trail;

CREATE POLICY "Service role can insert audit trail"
ON public.audit_trail
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Fix floor-plan-references: remove generic authenticated policies (keep business-owner ones)
DROP POLICY IF EXISTS "Authenticated users can delete floor plan references" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update floor plan references" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload floor plan references" ON storage.objects;

-- Add a proper update policy for business owners
CREATE POLICY "Business owners can update floor plan references"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'floor-plan-references'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.user_id = auth.uid()
    AND businesses.id = (storage.foldername(name))[1]::uuid
  )
);
