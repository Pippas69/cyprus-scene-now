CREATE POLICY "Users can cancel their own offer purchases"
ON public.offer_purchases
FOR UPDATE
USING (auth.uid() = user_id AND status = 'paid')
WITH CHECK (status = 'cancelled');