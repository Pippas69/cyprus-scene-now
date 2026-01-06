
-- Student Verifications table
CREATE TABLE public.student_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_email text NOT NULL,
  university_name text NOT NULL,
  university_domain text NOT NULL,
  qr_code_token uuid UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student Discount Partners table
CREATE TABLE public.student_discount_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  discount_percent integer NOT NULL DEFAULT 10 CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Student Discount Redemptions table
CREATE TABLE public.student_discount_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_verification_id uuid NOT NULL REFERENCES public.student_verifications(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES public.profiles(id),
  original_price_cents integer NOT NULL CHECK (original_price_cents >= 0),
  discounted_price_cents integer NOT NULL CHECK (discounted_price_cents >= 0),
  discount_amount_cents integer NOT NULL CHECK (discount_amount_cents >= 0),
  item_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Student Subsidy Invoices table
CREATE TABLE public.student_subsidy_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_redemptions integer NOT NULL DEFAULT 0,
  total_subsidy_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_student_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS student_qr_token uuid;

-- Enable RLS on all tables
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discount_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discount_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subsidy_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_verifications
CREATE POLICY "Users can view their own verification" ON public.student_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification" ON public.student_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications" ON public.student_verifications
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update verifications" ON public.student_verifications
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for student_discount_partners
CREATE POLICY "Anyone can view active partners" ON public.student_discount_partners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Business owners can view their partnership" ON public.student_discount_partners
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all partners" ON public.student_discount_partners
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for student_discount_redemptions
CREATE POLICY "Students can view their own redemptions" ON public.student_discount_redemptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM student_verifications sv WHERE sv.id = student_verification_id AND sv.user_id = auth.uid()
  ));

CREATE POLICY "Business owners can view and create redemptions" ON public.student_discount_redemptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Business owners can create redemptions" ON public.student_discount_redemptions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all redemptions" ON public.student_discount_redemptions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for student_subsidy_invoices
CREATE POLICY "Business owners can view their invoices" ON public.student_subsidy_invoices
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all invoices" ON public.student_subsidy_invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_student_verifications_user_id ON public.student_verifications(user_id);
CREATE INDEX idx_student_verifications_status ON public.student_verifications(status);
CREATE INDEX idx_student_verifications_qr_token ON public.student_verifications(qr_code_token);
CREATE INDEX idx_student_discount_partners_business_id ON public.student_discount_partners(business_id);
CREATE INDEX idx_student_discount_redemptions_business_id ON public.student_discount_redemptions(business_id);
CREATE INDEX idx_student_discount_redemptions_student_id ON public.student_discount_redemptions(student_verification_id);
CREATE INDEX idx_student_subsidy_invoices_business_id ON public.student_subsidy_invoices(business_id);
CREATE INDEX idx_student_subsidy_invoices_status ON public.student_subsidy_invoices(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_student_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_student_verifications_updated_at
  BEFORE UPDATE ON public.student_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_student_tables_updated_at();

CREATE TRIGGER update_student_discount_partners_updated_at
  BEFORE UPDATE ON public.student_discount_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_student_tables_updated_at();

CREATE TRIGGER update_student_subsidy_invoices_updated_at
  BEFORE UPDATE ON public.student_subsidy_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_student_tables_updated_at();
