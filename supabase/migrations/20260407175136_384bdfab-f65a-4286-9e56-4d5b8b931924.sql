
-- Create enum for fee bearer
CREATE TYPE public.fee_bearer AS ENUM ('buyer', 'business');

-- Create enum for revenue model
CREATE TYPE public.revenue_model AS ENUM ('commission', 'fixed_fee');

-- Create business_pricing_profiles table
CREATE TABLE public.business_pricing_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Axis 1: Stripe Fees
  stripe_fee_bearer fee_bearer NOT NULL DEFAULT 'buyer',
  
  -- Axis 2: Platform (ΦΟΜΟ) Revenue
  platform_revenue_enabled BOOLEAN NOT NULL DEFAULT false,
  revenue_model revenue_model NOT NULL DEFAULT 'commission',
  
  -- Commission model fields
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Fixed fee model fields
  fixed_fee_bearer fee_bearer NOT NULL DEFAULT 'business',
  fixed_fee_ticket_cents INTEGER NOT NULL DEFAULT 0,
  fixed_fee_reservation_cents INTEGER NOT NULL DEFAULT 0,
  fixed_fee_hybrid_ticket_cents INTEGER NOT NULL DEFAULT 0,
  fixed_fee_hybrid_reservation_cents INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_pricing_profiles ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role function
CREATE POLICY "Admins can view all pricing profiles"
  ON public.business_pricing_profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create pricing profiles"
  ON public.business_pricing_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing profiles"
  ON public.business_pricing_profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing profiles"
  ON public.business_pricing_profiles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can always read (for edge functions during checkout)
CREATE POLICY "Service role can read pricing profiles"
  ON public.business_pricing_profiles
  FOR SELECT
  TO service_role
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_business_pricing_profiles_updated_at
  BEFORE UPDATE ON public.business_pricing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups during checkout
CREATE INDEX idx_business_pricing_profiles_business_id 
  ON public.business_pricing_profiles(business_id);
