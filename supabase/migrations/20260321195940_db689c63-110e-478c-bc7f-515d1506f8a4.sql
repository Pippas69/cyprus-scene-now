-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "System only can insert notifications" ON notifications;

-- Allow authenticated users to insert notifications
-- Business owners need to send messages to their customers
CREATE POLICY "Authenticated users can insert notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (true);
