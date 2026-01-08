-- Allow business owners to update direct reservations for their business
CREATE POLICY "Business owners can update direct reservations"
ON public.reservations
FOR UPDATE
USING (
  reservations.event_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = reservations.business_id
    AND b.user_id = auth.uid()
  )
);

-- Allow business owners to view direct reservations for their business
CREATE POLICY "Business owners can view direct reservations"
ON public.reservations
FOR SELECT
USING (
  reservations.event_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = reservations.business_id
    AND b.user_id = auth.uid()
  )
);