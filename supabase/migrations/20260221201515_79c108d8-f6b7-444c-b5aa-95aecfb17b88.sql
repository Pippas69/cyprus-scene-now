
-- =============================================
-- 1. General Audit Trail for all critical actions
-- =============================================
CREATE TABLE public.audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,          -- e.g. 'reservation.created', 'ticket.checked_in', 'refund.issued'
  entity_type TEXT NOT NULL,     -- e.g. 'reservation', 'ticket', 'discount', 'event'
  entity_id TEXT,                -- the ID of the affected entity
  actor_id UUID,                 -- user who performed the action (null for system)
  actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'webhook', 'cron'
  business_id UUID,              -- which business this action relates to
  metadata JSONB DEFAULT '{}',   -- any extra context (old values, new values, etc.)
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by business
CREATE INDEX idx_audit_trail_business ON public.audit_trail(business_id, created_at DESC);
-- Index for querying by entity
CREATE INDEX idx_audit_trail_entity ON public.audit_trail(entity_type, entity_id);
-- Index for querying by actor
CREATE INDEX idx_audit_trail_actor ON public.audit_trail(actor_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Business owners can read their own audit trail
CREATE POLICY "Business owners can view their audit trail"
  ON public.audit_trail FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert (via edge functions / triggers)
CREATE POLICY "Service role can insert audit trail"
  ON public.audit_trail FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 2. Offline scan queue table for conflict resolution
-- =============================================
CREATE TABLE public.offline_scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL,        -- 'ticket', 'reservation', 'offer', 'student'
  qr_data TEXT NOT NULL,
  business_id UUID NOT NULL,
  scanned_by UUID,
  scanned_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'synced', 'conflict', 'failed'
  conflict_reason TEXT,
  server_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offline_scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business staff can view their offline scans"
  ON public.offline_scan_results FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert offline scans"
  ON public.offline_scan_results FOR INSERT
  WITH CHECK (auth.uid() = scanned_by);

-- =============================================
-- 3. Audit trail triggers for critical tables
-- =============================================

-- Generic audit function
CREATE OR REPLACE FUNCTION public.fn_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_business_id UUID;
  v_actor_id UUID;
  v_metadata JSONB;
  v_entity_type TEXT;
BEGIN
  v_entity_type := TG_ARGV[0];
  
  IF TG_OP = 'INSERT' THEN
    v_action := v_entity_type || '.created';
    v_metadata := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := v_entity_type || '.updated';
    v_metadata := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := v_entity_type || '.deleted';
    v_metadata := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  -- Try to extract business_id from the row
  IF TG_OP = 'DELETE' THEN
    v_business_id := CASE 
      WHEN to_jsonb(OLD) ? 'business_id' THEN (to_jsonb(OLD)->>'business_id')::UUID
      ELSE NULL
    END;
  ELSE
    v_business_id := CASE 
      WHEN to_jsonb(NEW) ? 'business_id' THEN (to_jsonb(NEW)->>'business_id')::UUID
      ELSE NULL
    END;
  END IF;

  INSERT INTO public.audit_trail (action, entity_type, entity_id, actor_type, business_id, metadata)
  VALUES (
    v_action,
    v_entity_type,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    'system',
    v_business_id,
    v_metadata
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Audit reservations
CREATE TRIGGER audit_reservations
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail('reservation');

-- Audit ticket orders
CREATE TRIGGER audit_ticket_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.ticket_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail('ticket_order');

-- Audit tickets
CREATE TRIGGER audit_tickets
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail('ticket');

-- Audit commission ledger
CREATE TRIGGER audit_commission_ledger
  AFTER INSERT OR UPDATE ON public.commission_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail('commission');

-- Audit events (important changes)
CREATE TRIGGER audit_events
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail('event');

-- Audit discounts / offers
CREATE TRIGGER audit_discounts
  AFTER INSERT OR UPDATE OR DELETE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail('discount');
