-- Add INSERT policy for notification_log (system/service role can insert)
CREATE POLICY "Service role can insert notification logs"
ON public.notification_log
FOR INSERT
WITH CHECK (true);

-- Add policy to allow authenticated users to insert their own logs (for edge functions with user context)
CREATE POLICY "Users can insert their own notification logs"
ON public.notification_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);