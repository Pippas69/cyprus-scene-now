
-- 1. Fix ticket trigger: remove guest_name from trigger columns
DROP TRIGGER IF EXISTS trg_crm_guest_from_ticket ON public.tickets;
CREATE TRIGGER trg_crm_guest_from_ticket
AFTER INSERT OR UPDATE OF user_id, event_id, order_id, status
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_ticket();

-- 2. Fix reservation trigger: remove reservation_name from trigger columns
DROP TRIGGER IF EXISTS trg_crm_guest_from_reservation ON public.reservations;
CREATE TRIGGER trg_crm_guest_from_reservation
AFTER INSERT OR UPDATE OF user_id, phone_number, business_id, event_id
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_reservation();

-- 3. Fix RLS: The "Business owners can update manual ticket status" policy
-- restricts WITH CHECK to is_manual_entry=true, which blocks name updates on non-manual tickets.
-- Replace it with a broader policy that allows updating ALL tickets for business owner events.
DROP POLICY IF EXISTS "Business owners can update manual ticket status" ON public.tickets;
DROP POLICY IF EXISTS "Business owners can update tickets for their events" ON public.tickets;

CREATE POLICY "Business owners can update tickets for their events"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = tickets.event_id AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = tickets.event_id AND b.user_id = auth.uid()
  )
);
