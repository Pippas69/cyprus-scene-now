-- Create enum for ticket status
CREATE TYPE ticket_status AS ENUM ('valid', 'used', 'cancelled', 'refunded');

-- Create enum for order status  
CREATE TYPE ticket_order_status AS ENUM ('pending', 'completed', 'refunded', 'cancelled');

-- Create ticket_tiers table - ticket types for each event
CREATE TABLE public.ticket_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  quantity_total INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  sale_start_at TIMESTAMPTZ,
  sale_end_at TIMESTAMPTZ,
  max_per_order INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket_orders table - purchase transactions
CREATE TABLE public.ticket_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  commission_cents INTEGER NOT NULL DEFAULT 0,
  commission_percent INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status ticket_order_status NOT NULL DEFAULT 'pending',
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tickets table - individual tickets with QR codes
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  qr_code_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status ticket_status NOT NULL DEFAULT 'valid',
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket_commission_rates table
CREATE TABLE public.ticket_commission_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_slug TEXT NOT NULL UNIQUE,
  commission_percent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default commission rates
INSERT INTO public.ticket_commission_rates (plan_slug, commission_percent) VALUES
  ('free', 12),
  ('starter', 10),
  ('growth', 5),
  ('professional', 0);

-- Create indexes for performance
CREATE INDEX idx_ticket_tiers_event_id ON public.ticket_tiers(event_id);
CREATE INDEX idx_ticket_tiers_active ON public.ticket_tiers(active) WHERE active = true;
CREATE INDEX idx_ticket_orders_user_id ON public.ticket_orders(user_id);
CREATE INDEX idx_ticket_orders_event_id ON public.ticket_orders(event_id);
CREATE INDEX idx_ticket_orders_business_id ON public.ticket_orders(business_id);
CREATE INDEX idx_ticket_orders_status ON public.ticket_orders(status);
CREATE INDEX idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_qr_code_token ON public.tickets(qr_code_token);
CREATE INDEX idx_tickets_status ON public.tickets(status);

-- Enable RLS
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_commission_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_tiers
CREATE POLICY "Anyone can view active ticket tiers"
  ON public.ticket_tiers FOR SELECT
  USING (active = true);

CREATE POLICY "Business owners can manage their event ticket tiers"
  ON public.ticket_tiers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = ticket_tiers.event_id AND b.user_id = auth.uid()
  ));

-- RLS Policies for ticket_orders
CREATE POLICY "Users can view their own orders"
  ON public.ticket_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view orders for their events"
  ON public.ticket_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = ticket_orders.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Users can create orders"
  ON public.ticket_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update orders"
  ON public.ticket_orders FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = ticket_orders.business_id AND b.user_id = auth.uid()
  ));

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view tickets for their events"
  ON public.tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = tickets.event_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Business owners can update tickets for their events"
  ON public.tickets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM events e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = tickets.event_id AND b.user_id = auth.uid()
  ));

-- RLS Policies for commission rates (read-only for all)
CREATE POLICY "Anyone can view commission rates"
  ON public.ticket_commission_rates FOR SELECT
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_ticket_tiers_updated_at
  BEFORE UPDATE ON public.ticket_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_orders_updated_at
  BEFORE UPDATE ON public.ticket_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets (for live check-in updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;