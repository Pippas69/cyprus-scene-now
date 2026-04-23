-- 1. Add care_of to reservations and ticket_orders
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS care_of text;

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS care_of text;

-- 2. Enable realtime for pending_bookings
ALTER TABLE public.pending_bookings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pending_bookings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_bookings';
  END IF;
END $$;

-- 3. One-shot sold-out notification flag on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sold_out_pending_notified_at timestamp with time zone;

-- 4. Function: check if event sold out with pending links and notify business owner
CREATE OR REPLACE FUNCTION public.notify_sold_out_with_pending(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_business_owner_id uuid;
  v_pending_count int;
  v_total_capacity int;
  v_total_sold int;
BEGIN
  -- Load event + business owner
  SELECT e.id, e.title, e.business_id, e.max_total_reservations,
         e.sold_out_pending_notified_at, b.user_id
    INTO v_event
  FROM public.events e
  JOIN public.businesses b ON b.id = e.business_id
  WHERE e.id = p_event_id;

  IF v_event.id IS NULL THEN
    RETURN;
  END IF;

  -- Already notified once — bail
  IF v_event.sold_out_pending_notified_at IS NOT NULL THEN
    RETURN;
  END IF;

  -- Count pending bookings (active links, not expired/cancelled)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.pending_bookings
  WHERE event_id = p_event_id
    AND status = 'pending'
    AND expires_at > now();

  IF v_pending_count = 0 THEN
    RETURN;
  END IF;

  -- Approximate sold count: confirmed reservations party_size + ticket count
  SELECT
    COALESCE((SELECT SUM(party_size) FROM public.reservations
              WHERE event_id = p_event_id AND status = 'confirmed'), 0)
    + COALESCE((SELECT COUNT(*) FROM public.tickets t
                JOIN public.ticket_orders o ON o.id = t.order_id
                WHERE o.event_id = p_event_id AND t.status IN ('valid','used')), 0)
  INTO v_total_sold;

  v_total_capacity := COALESCE(v_event.max_total_reservations, 0);

  -- Only fire if capacity > 0 and sold has reached/exceeded it
  IF v_total_capacity <= 0 OR v_total_sold < v_total_capacity THEN
    RETURN;
  END IF;

  -- Insert in-app notification for the business owner
  INSERT INTO public.notifications (user_id, type, title, message, data, created_at)
  VALUES (
    v_event.user_id,
    'event_sold_out_with_pending',
    'Event sold out — pending links',
    'Η εκδήλωση "' || v_event.title || '" γέμισε. Υπάρχουν ' || v_pending_count || ' εκκρεμή links πληρωμής.',
    jsonb_build_object(
      'event_id', v_event.id,
      'pending_count', v_pending_count
    ),
    now()
  );

  -- Mark notified
  UPDATE public.events
    SET sold_out_pending_notified_at = now()
  WHERE id = p_event_id;
END;
$$;

-- 5. Trigger on reservations confirm
CREATE OR REPLACE FUNCTION public.trg_check_sold_out_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    PERFORM public.notify_sold_out_with_pending(NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_check_sold_out ON public.reservations;
CREATE TRIGGER trg_reservations_check_sold_out
  AFTER INSERT OR UPDATE OF status ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_sold_out_reservations();

-- 6. Trigger on tickets becoming valid
CREATE OR REPLACE FUNCTION public.trg_check_sold_out_tickets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF NEW.status = 'valid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'valid') THEN
    SELECT event_id INTO v_event_id FROM public.ticket_orders WHERE id = NEW.order_id;
    IF v_event_id IS NOT NULL THEN
      PERFORM public.notify_sold_out_with_pending(v_event_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_check_sold_out ON public.tickets;
CREATE TRIGGER trg_tickets_check_sold_out
  AFTER INSERT OR UPDATE OF status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_sold_out_tickets();