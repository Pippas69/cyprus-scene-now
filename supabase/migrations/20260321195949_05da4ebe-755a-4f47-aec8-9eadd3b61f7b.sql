-- Replace the overly permissive policy with a scoped one
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Business owners can send messages to their CRM guests (who have a linked user_id)
CREATE POLICY "Business owners can message their guests"
ON notifications FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm_guests cg
    JOIN businesses b ON b.id = cg.business_id
    WHERE cg.user_id = notifications.user_id
      AND b.user_id = auth.uid()
  )
);
