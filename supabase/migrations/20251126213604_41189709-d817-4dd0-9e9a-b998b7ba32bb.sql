-- Payment System Phase 1: Core Database Tables
-- Creates 6 tables for subscription plans, business subscriptions, event/offer boosts, commission ledger, and invoices

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly_cents INTEGER NOT NULL,
  price_annual_cents INTEGER NOT NULL,
  event_boost_budget_cents INTEGER NOT NULL,
  commission_free_offers_count INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for subscription_plans: Public read access
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
ON subscription_plans FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage subscription plans"
ON subscription_plans FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. BUSINESS SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'paused');

CREATE TABLE business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status subscription_status DEFAULT 'active',
  billing_cycle billing_cycle DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  monthly_budget_remaining_cents INTEGER DEFAULT 0,
  commission_free_offers_remaining INTEGER DEFAULT 0,
  beta_tester BOOLEAN DEFAULT false,
  beta_discount_percent INTEGER DEFAULT 0,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id)
);

-- RLS for business_subscriptions
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own subscription"
ON business_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = business_subscriptions.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Businesses can update their own subscription"
ON business_subscriptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = business_subscriptions.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all subscriptions"
ON business_subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all subscriptions"
ON business_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. EVENT BOOSTS TABLE
-- =====================================================
CREATE TYPE boost_tier AS ENUM ('basic', 'standard', 'premium', 'elite');
CREATE TYPE boost_status AS ENUM ('scheduled', 'active', 'completed', 'canceled');
CREATE TYPE boost_source AS ENUM ('subscription', 'purchase');

CREATE TABLE event_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  boost_tier boost_tier NOT NULL,
  daily_rate_cents INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status boost_status DEFAULT 'scheduled',
  source boost_source NOT NULL,
  targeting_quality INTEGER CHECK (targeting_quality >= 1 AND targeting_quality <= 5),
  stripe_payment_intent_id TEXT,
  total_cost_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for event_boosts
ALTER TABLE event_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own event boosts"
ON event_boosts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = event_boosts.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Businesses can create their own event boosts"
ON event_boosts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = event_boosts.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all event boosts"
ON event_boosts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all event boosts"
ON event_boosts FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. OFFER BOOSTS TABLE
-- =====================================================
CREATE TABLE offer_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  commission_percent INTEGER NOT NULL CHECK (commission_percent IN (5, 10, 15, 20, 25)),
  targeting_quality INTEGER NOT NULL CHECK (targeting_quality >= 1 AND targeting_quality <= 5),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(discount_id)
);

-- RLS for offer_boosts
ALTER TABLE offer_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own offer boosts"
ON offer_boosts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = offer_boosts.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Businesses can create their own offer boosts"
ON offer_boosts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = offer_boosts.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Businesses can update their own offer boosts"
ON offer_boosts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = offer_boosts.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all offer boosts"
ON offer_boosts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all offer boosts"
ON offer_boosts FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. COMMISSION LEDGER TABLE
-- =====================================================
CREATE TYPE commission_status AS ENUM ('pending', 'invoiced', 'paid', 'disputed');

CREATE TABLE commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  original_price_cents INTEGER NOT NULL,
  commission_percent INTEGER NOT NULL,
  commission_amount_cents INTEGER NOT NULL,
  status commission_status DEFAULT 'pending',
  invoice_id UUID,
  redeemed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for commission_ledger
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own commissions"
ON commission_ledger FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = commission_ledger.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all commissions"
ON commission_ledger FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all commissions"
ON commission_ledger FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. PAYMENT INVOICES TABLE
-- =====================================================
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'canceled');

CREATE TABLE payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  commission_total_cents INTEGER DEFAULT 0,
  boost_total_cents INTEGER DEFAULT 0,
  subscription_total_cents INTEGER DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  stripe_invoice_id TEXT UNIQUE,
  pdf_url TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for payment_invoices
ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own invoices"
ON payment_invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = payment_invoices.business_id 
    AND businesses.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all invoices"
ON payment_invoices FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all invoices"
ON payment_invoices FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_business_subscriptions_business_id ON business_subscriptions(business_id);
CREATE INDEX idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX idx_event_boosts_event_id ON event_boosts(event_id);
CREATE INDEX idx_event_boosts_business_id ON event_boosts(business_id);
CREATE INDEX idx_event_boosts_dates ON event_boosts(start_date, end_date);
CREATE INDEX idx_event_boosts_status ON event_boosts(status);
CREATE INDEX idx_offer_boosts_discount_id ON offer_boosts(discount_id);
CREATE INDEX idx_offer_boosts_business_id ON offer_boosts(business_id);
CREATE INDEX idx_commission_ledger_business_id ON commission_ledger(business_id);
CREATE INDEX idx_commission_ledger_status ON commission_ledger(status);
CREATE INDEX idx_commission_ledger_invoice_id ON commission_ledger(invoice_id);
CREATE INDEX idx_payment_invoices_business_id ON payment_invoices(business_id);
CREATE INDEX idx_payment_invoices_status ON payment_invoices(status);
CREATE INDEX idx_payment_invoices_period ON payment_invoices(period_start, period_end);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_subscriptions_updated_at
BEFORE UPDATE ON business_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_boosts_updated_at
BEFORE UPDATE ON event_boosts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offer_boosts_updated_at
BEFORE UPDATE ON offer_boosts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_ledger_updated_at
BEFORE UPDATE ON commission_ledger
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_invoices_updated_at
BEFORE UPDATE ON payment_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: INSERT 4 SUBSCRIPTION PLANS
-- =====================================================
INSERT INTO subscription_plans (name, slug, price_monthly_cents, price_annual_cents, event_boost_budget_cents, commission_free_offers_count, features, display_order) VALUES
(
  'Starter',
  'starter',
  10000, -- €100/month
  100000, -- €1,000/year (2 months free)
  10000, -- €100 monthly boost budget
  5,
  '["3 event boosts per month", "5 commission-free offers per month", "Basic targeting quality", "Monthly analytics", "Email support"]'::jsonb,
  1
),
(
  'Growth',
  'growth',
  20000, -- €200/month
  200000, -- €2,000/year (2 months free)
  20000, -- €200 monthly boost budget
  10,
  '["5 event boosts per month", "10 commission-free offers per month", "Standard targeting quality", "Advanced analytics", "Priority email support", "Custom event categories"]'::jsonb,
  2
),
(
  'Professional',
  'professional',
  40000, -- €400/month
  400000, -- €4,000/year (2 months free)
  40000, -- €400 monthly boost budget
  20,
  '["10 event boosts per month", "20 commission-free offers per month", "Premium targeting quality", "Real-time analytics", "Priority phone support", "Custom branding", "API access"]'::jsonb,
  3
),
(
  'Enterprise',
  'enterprise',
  0, -- Custom pricing
  0, -- Custom pricing
  0, -- Custom budget
  0,
  '["Unlimited event boosts", "Unlimited commission-free offers", "Elite targeting quality", "Dedicated account manager", "24/7 priority support", "Custom integrations", "White-label options", "Advanced reporting"]'::jsonb,
  4
);