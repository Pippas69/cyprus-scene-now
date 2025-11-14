-- Allow admins to update any business (for approval/rejection)
CREATE POLICY "Admins can update any business"
ON public.businesses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);