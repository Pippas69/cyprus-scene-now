
-- Fix: Remove 'status' from trigger columns so check-in/no-show doesn't create duplicate CRM entries
DROP TRIGGER IF EXISTS trg_crm_guest_from_ticket ON public.tickets;
CREATE TRIGGER trg_crm_guest_from_ticket
AFTER INSERT OR UPDATE OF user_id, event_id, order_id
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_ticket();
