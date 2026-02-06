-- Add UPDATE policy for business owners to update student discount redemptions
CREATE POLICY "Business can update student discount redemptions"
ON public.student_discount_redemptions
FOR UPDATE
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));