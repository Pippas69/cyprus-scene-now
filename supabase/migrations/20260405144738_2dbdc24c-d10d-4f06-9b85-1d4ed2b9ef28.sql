
-- Allow anon/public to read subscription plan info (safe fields only via the view)
CREATE POLICY "Anyone can view subscription plan info"
ON public.business_subscriptions
FOR SELECT
TO anon, authenticated
USING (true);
