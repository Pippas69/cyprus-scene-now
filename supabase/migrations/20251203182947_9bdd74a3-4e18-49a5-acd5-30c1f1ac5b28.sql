-- Create app_settings table for global configuration
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create beta_invite_codes table
CREATE TABLE public.beta_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID,
  used_by UUID,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_invite_codes ENABLE ROW LEVEL SECURITY;

-- App settings policies - everyone can read, only admins can modify
CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Beta invite codes policies
CREATE POLICY "Anyone can validate invite codes"
ON public.beta_invite_codes FOR SELECT
USING (true);

CREATE POLICY "Admins can manage invite codes"
ON public.beta_invite_codes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous users to update codes during signup (increment uses)
CREATE POLICY "Anyone can use valid invite codes"
ON public.beta_invite_codes FOR UPDATE
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND current_uses < max_uses)
WITH CHECK (is_active = true);

-- Insert default beta mode setting (enabled)
INSERT INTO public.app_settings (key, value) VALUES 
  ('beta_mode', '{"enabled": true, "message_el": "Σύντομα κοντά σας!", "message_en": "Coming Soon!"}'::jsonb);

-- Create indexes for performance
CREATE INDEX idx_beta_invite_codes_code ON public.beta_invite_codes(code);
CREATE INDEX idx_beta_invite_codes_is_active ON public.beta_invite_codes(is_active);
CREATE INDEX idx_app_settings_key ON public.app_settings(key);