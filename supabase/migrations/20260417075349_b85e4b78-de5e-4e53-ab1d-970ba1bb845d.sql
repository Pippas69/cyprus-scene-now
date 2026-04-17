-- ============================================================
-- PHASE 1: PROMOTER SYSTEM FOUNDATION
-- ============================================================

-- 1. Add 'promoter' to app_role enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'promoter'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'promoter';
  END IF;
END$$;

-- 2. Commission type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promoter_commission_type') THEN
    CREATE TYPE public.promoter_commission_type AS ENUM ('fixed', 'percent');
  END IF;
END$$;

-- 3. Application status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promoter_application_status') THEN
    CREATE TYPE public.promoter_application_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');
  END IF;
END$$;

-- ============================================================
-- TABLE 1: promoter_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promoter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status public.promoter_application_status NOT NULL DEFAULT 'pending',
  message text,
  -- Commission settings (set by business on accept)
  commission_type public.promoter_commission_type,
  commission_fixed_ticket_cents integer DEFAULT 0,
  commission_fixed_reservation_cents integer DEFAULT 0,
  commission_percent numeric(5,2) DEFAULT 0,
  -- Decision metadata
  decided_at timestamptz,
  decided_by uuid,
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promoter_user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_promoter_apps_promoter ON public.promoter_applications(promoter_user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_apps_business ON public.promoter_applications(business_id);
CREATE INDEX IF NOT EXISTS idx_promoter_apps_status ON public.promoter_applications(status);

ALTER TABLE public.promoter_applications ENABLE ROW LEVEL SECURITY;

-- Promoter can see their own applications
CREATE POLICY "Promoter views own applications"
  ON public.promoter_applications FOR SELECT
  USING (auth.uid() = promoter_user_id);

-- Business owner can see applications to their business
CREATE POLICY "Business owner views applications to their business"
  ON public.promoter_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = promoter_applications.business_id
        AND b.user_id = auth.uid()
    )
  );

-- Promoter can create their own applications
CREATE POLICY "Promoter creates own applications"
  ON public.promoter_applications FOR INSERT
  WITH CHECK (auth.uid() = promoter_user_id);

-- Promoter can revoke (delete) their own pending applications
CREATE POLICY "Promoter deletes own pending applications"
  ON public.promoter_applications FOR DELETE
  USING (auth.uid() = promoter_user_id AND status = 'pending');

-- Business owner can update (accept/decline) applications to their business
CREATE POLICY "Business owner updates applications"
  ON public.promoter_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = promoter_applications.business_id
        AND b.user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admins manage all promoter applications"
  ON public.promoter_applications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promoter_applications_updated_at
  BEFORE UPDATE ON public.promoter_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE 2: promoter_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promoter_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  tracking_code text NOT NULL UNIQUE,
  clicks_count integer NOT NULL DEFAULT 0,
  conversions_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promoter_links_promoter ON public.promoter_links(promoter_user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_links_business ON public.promoter_links(business_id);
CREATE INDEX IF NOT EXISTS idx_promoter_links_event ON public.promoter_links(event_id);
CREATE INDEX IF NOT EXISTS idx_promoter_links_code ON public.promoter_links(tracking_code);

ALTER TABLE public.promoter_links ENABLE ROW LEVEL SECURITY;

-- Promoter manages own links
CREATE POLICY "Promoter views own links"
  ON public.promoter_links FOR SELECT
  USING (auth.uid() = promoter_user_id);

CREATE POLICY "Promoter creates own links"
  ON public.promoter_links FOR INSERT
  WITH CHECK (
    auth.uid() = promoter_user_id
    AND EXISTS (
      SELECT 1 FROM public.promoter_applications pa
      WHERE pa.promoter_user_id = auth.uid()
        AND pa.business_id = promoter_links.business_id
        AND pa.status = 'accepted'
    )
  );

CREATE POLICY "Promoter updates own links"
  ON public.promoter_links FOR UPDATE
  USING (auth.uid() = promoter_user_id);

CREATE POLICY "Promoter deletes own links"
  ON public.promoter_links FOR DELETE
  USING (auth.uid() = promoter_user_id);

-- Business owner views links for their business
CREATE POLICY "Business owner views links"
  ON public.promoter_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = promoter_links.business_id
        AND b.user_id = auth.uid()
    )
  );

-- Public read for tracking code resolution (only minimal columns are queried)
CREATE POLICY "Public can resolve tracking codes"
  ON public.promoter_links FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage all promoter links"
  ON public.promoter_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promoter_links_updated_at
  BEFORE UPDATE ON public.promoter_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE 3: promoter_attributions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promoter_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  promoter_link_id uuid REFERENCES public.promoter_links(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  -- Attribution target: either ticket or reservation
  ticket_order_id uuid REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  customer_user_id uuid,
  attribution_source text NOT NULL DEFAULT 'link_click',
  -- Commission snapshot (frozen at attribution time)
  commission_type public.promoter_commission_type,
  commission_fixed_cents integer DEFAULT 0,
  commission_percent numeric(5,2) DEFAULT 0,
  order_amount_cents integer DEFAULT 0,
  commission_earned_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promoter_attribution_target_check CHECK (
    (ticket_order_id IS NOT NULL) OR (reservation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_promoter_attr_promoter ON public.promoter_attributions(promoter_user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_attr_business ON public.promoter_attributions(business_id);
CREATE INDEX IF NOT EXISTS idx_promoter_attr_event ON public.promoter_attributions(event_id);
CREATE INDEX IF NOT EXISTS idx_promoter_attr_ticket ON public.promoter_attributions(ticket_order_id);
CREATE INDEX IF NOT EXISTS idx_promoter_attr_reservation ON public.promoter_attributions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_promoter_attr_customer ON public.promoter_attributions(customer_user_id);

ALTER TABLE public.promoter_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoter views own attributions"
  ON public.promoter_attributions FOR SELECT
  USING (auth.uid() = promoter_user_id);

CREATE POLICY "Business owner views attributions"
  ON public.promoter_attributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = promoter_attributions.business_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all promoter attributions"
  ON public.promoter_attributions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promoter_attributions_updated_at
  BEFORE UPDATE ON public.promoter_attributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if a user is an accepted promoter for any business
CREATE OR REPLACE FUNCTION public.is_active_promoter(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.promoter_applications
    WHERE promoter_user_id = _user_id
      AND status = 'accepted'
  );
$$;

-- Check if a user is an accepted promoter for a specific business
CREATE OR REPLACE FUNCTION public.is_promoter_for_business(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.promoter_applications
    WHERE promoter_user_id = _user_id
      AND business_id = _business_id
      AND status = 'accepted'
  );
$$;

-- Generate a unique tracking code for a promoter link
CREATE OR REPLACE FUNCTION public.generate_promoter_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- 8-char alphanumeric code (excluding confusing chars)
    new_code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.promoter_links WHERE tracking_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;