-- Allow business owners to delete ticket orders & tickets for expired events (required for deleting past events with sales)

-- ticket_orders
DROP POLICY IF EXISTS "Business owners can delete ticket orders for expired events" ON public.ticket_orders;
CREATE POLICY "Business owners can delete ticket orders for expired events"
ON public.ticket_orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.id = ticket_orders.event_id
      AND b.user_id = auth.uid()
      AND e.end_at < now()
  )
);

-- tickets
DROP POLICY IF EXISTS "Business owners can delete tickets for expired events" ON public.tickets;
CREATE POLICY "Business owners can delete tickets for expired events"
ON public.tickets
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.id = tickets.event_id
      AND b.user_id = auth.uid()
      AND e.end_at < now()
  )
);
