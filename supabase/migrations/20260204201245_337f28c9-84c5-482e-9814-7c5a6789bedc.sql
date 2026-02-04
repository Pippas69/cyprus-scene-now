
-- Add RLS policy to allow business owners to view student verifications 
-- for students who have redeemed discounts at their business
CREATE POLICY "Business owners can view verifications for their redemptions"
ON public.student_verifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM student_discount_redemptions sdr
    JOIN businesses b ON b.id = sdr.business_id
    WHERE sdr.student_verification_id = student_verifications.id
    AND b.user_id = auth.uid()
  )
);
