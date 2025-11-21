-- Add policy for businesses to view redemptions for their offers
CREATE POLICY "Businesses can view redemptions for their offers"
ON redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM discounts d
    JOIN businesses b ON d.business_id = b.id
    WHERE d.id = redemptions.discount_id
    AND b.user_id = auth.uid()
  )
);

-- Allow businesses to verify redemptions
CREATE POLICY "Businesses can verify redemptions"
ON redemptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM discounts d
    JOIN businesses b ON d.business_id = b.id
    WHERE d.id = redemptions.discount_id
    AND b.user_id = auth.uid()
  )
);