
CREATE TABLE public.crm_communication_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.crm_guests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'sms', 'email')),
  subject TEXT,
  message TEXT NOT NULL,
  recipient_contact TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their communication logs"
  ON public.crm_communication_log
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert communication logs"
  ON public.crm_communication_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_crm_comm_log_guest ON public.crm_communication_log(guest_id);
CREATE INDEX idx_crm_comm_log_business ON public.crm_communication_log(business_id);
