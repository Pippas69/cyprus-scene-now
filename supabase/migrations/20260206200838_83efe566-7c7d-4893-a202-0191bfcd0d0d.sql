-- Fix RLS for public.ticket_tiers: INSERT needs WITH CHECK
-- Existing policy has USING but no WITH CHECK, so inserts fail.

DROP POLICY IF EXISTS "Business owners can manage their event ticket tiers" ON public.ticket_tiers;

CREATE POLICY "Business owners can manage their event ticket tiers"
ON public.ticket_tiers
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.businesses b ON e.business_id = b.id
    WHERE e.id = ticket_tiers.event_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.businesses b ON e.business_id = b.id
    WHERE e.id = ticket_tiers.event_id
      AND b.user_id = auth.uid()
  )
);
