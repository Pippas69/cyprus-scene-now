
-- 1. promoter_link_clicks: click tracking with anti-fraud + 30-day attribution window
CREATE TABLE IF NOT EXISTS public.promoter_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.promoter_links(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  is_self_click BOOLEAN NOT NULL DEFAULT false,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_promoter_clicks_link ON public.promoter_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_promoter_clicks_session ON public.promoter_link_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_promoter_clicks_user ON public.promoter_link_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_clicks_expires ON public.promoter_link_clicks(expires_at);
CREATE INDEX IF NOT EXISTS idx_promoter_clicks_attribution ON public.promoter_link_clicks(session_id, expires_at, is_self_click);

ALTER TABLE public.promoter_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PR can view own link clicks" ON public.promoter_link_clicks;
CREATE POLICY "PR can view own link clicks" ON public.promoter_link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.promoter_links pl
      WHERE pl.id = promoter_link_clicks.link_id AND pl.promoter_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can view clicks for their events" ON public.promoter_link_clicks;
CREATE POLICY "Business owners can view clicks for their events" ON public.promoter_link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.promoter_links pl
      JOIN public.businesses b ON b.id = pl.business_id
      WHERE pl.id = promoter_link_clicks.link_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage all promoter clicks" ON public.promoter_link_clicks;
CREATE POLICY "Admins manage all promoter clicks" ON public.promoter_link_clicks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Extend promoter_attributions with customer info + payment tracking
ALTER TABLE public.promoter_attributions
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_promoter_attr_payment_status ON public.promoter_attributions(payment_status);

-- 3. Unique constraint to prevent duplicate attributions for the same order/reservation
CREATE UNIQUE INDEX IF NOT EXISTS uq_attribution_ticket ON public.promoter_attributions(ticket_order_id) WHERE ticket_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_attribution_reservation ON public.promoter_attributions(reservation_id) WHERE reservation_id IS NOT NULL;

-- 4. Helper function: generate a unique tracking code in format "name-xxx"
CREATE OR REPLACE FUNCTION public.generate_promoter_tracking_code(_promoter_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name_part TEXT;
  _random_part TEXT;
  _candidate TEXT;
  _attempt INT := 0;
BEGIN
  SELECT lower(regexp_replace(COALESCE(split_part(full_name, ' ', 1), 'pr'), '[^a-zA-Z]', '', 'g'))
  INTO _name_part
  FROM public.profiles
  WHERE id = _promoter_user_id;

  IF _name_part IS NULL OR length(_name_part) = 0 THEN
    _name_part := 'pr';
  END IF;

  _name_part := substring(_name_part, 1, 12);

  LOOP
    _random_part := lower(substring(md5(random()::text || clock_timestamp()::text), 1, 4));
    _candidate := _name_part || '-' || _random_part;

    IF NOT EXISTS (SELECT 1 FROM public.promoter_links WHERE tracking_code = _candidate) THEN
      RETURN _candidate;
    END IF;

    _attempt := _attempt + 1;
    IF _attempt > 10 THEN
      RETURN _name_part || '-' || lower(substring(md5(random()::text || gen_random_uuid()::text), 1, 8));
    END IF;
  END LOOP;
END;
$$;

-- 5. Helper function: resolve a tracking code to its link (public, used by tracking)
CREATE OR REPLACE FUNCTION public.resolve_promoter_tracking_code(_tracking_code TEXT)
RETURNS TABLE (
  link_id UUID,
  promoter_user_id UUID,
  business_id UUID,
  event_id UUID,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, promoter_user_id, business_id, event_id, active
  FROM public.promoter_links
  WHERE tracking_code = _tracking_code
  LIMIT 1;
$$;

-- 6. Helper function: record a click with anti-fraud + counter updates
CREATE OR REPLACE FUNCTION public.record_promoter_click(
  _tracking_code TEXT,
  _session_id TEXT,
  _user_id UUID DEFAULT NULL,
  _ip_hash TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link RECORD;
  _is_self BOOLEAN := false;
  _is_unique BOOLEAN := true;
  _click_id UUID;
BEGIN
  SELECT id, promoter_user_id, active
  INTO _link
  FROM public.promoter_links
  WHERE tracking_code = _tracking_code;

  IF NOT FOUND OR NOT _link.active THEN
    RETURN NULL;
  END IF;

  IF _user_id IS NOT NULL AND _user_id = _link.promoter_user_id THEN
    _is_self := true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.promoter_link_clicks
    WHERE link_id = _link.id AND session_id = _session_id
  ) THEN
    _is_unique := false;
  END IF;

  INSERT INTO public.promoter_link_clicks (link_id, session_id, user_id, ip_hash, user_agent, is_self_click)
  VALUES (_link.id, _session_id, _user_id, _ip_hash, _user_agent, _is_self)
  RETURNING id INTO _click_id;

  IF NOT _is_self THEN
    UPDATE public.promoter_links
    SET clicks_count = clicks_count + 1,
        updated_at = now()
    WHERE id = _link.id;
  END IF;

  RETURN _click_id;
END;
$$;

-- 7. Helper function: find the active attribution for a session/user (last-click wins, within 30 days)
CREATE OR REPLACE FUNCTION public.get_active_promoter_attribution(
  _session_id TEXT,
  _user_id UUID DEFAULT NULL,
  _event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  link_id UUID,
  promoter_user_id UUID,
  business_id UUID,
  event_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl.id, pl.promoter_user_id, pl.business_id, pl.event_id
  FROM public.promoter_link_clicks plc
  JOIN public.promoter_links pl ON pl.id = plc.link_id
  WHERE plc.is_self_click = false
    AND plc.expires_at > now()
    AND (plc.session_id = _session_id OR (_user_id IS NOT NULL AND plc.user_id = _user_id))
    AND (_event_id IS NULL OR pl.event_id = _event_id)
    AND pl.active = true
  ORDER BY plc.clicked_at DESC
  LIMIT 1;
$$;
