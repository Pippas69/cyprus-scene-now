
-- =============================================
-- FOMO CRM: Guest Intelligence System (Elite only)
-- =============================================

-- 1) Guest profiles
CREATE TABLE public.crm_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birthday DATE,
  anniversary DATE,
  dietary_preferences TEXT[],
  drink_preferences TEXT,
  music_preferences TEXT,
  company TEXT,
  instagram_handle TEXT,
  relationship_notes TEXT,
  internal_rating INT CHECK (internal_rating BETWEEN 1 AND 5),
  vip_level_override TEXT CHECK (vip_level_override IN ('bronze', 'silver', 'gold', 'platinum')),
  profile_type TEXT NOT NULL DEFAULT 'registered' CHECK (profile_type IN ('registered', 'ghost', 'merged')),
  merged_from UUID[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_crm_guests_business_user ON public.crm_guests (business_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_crm_guests_business ON public.crm_guests (business_id);
CREATE INDEX idx_crm_guests_user ON public.crm_guests (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.crm_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their guests"
ON public.crm_guests FOR SELECT TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can insert guests"
ON public.crm_guests FOR INSERT TO authenticated
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can update their guests"
ON public.crm_guests FOR UPDATE TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can delete their guests"
ON public.crm_guests FOR DELETE TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- 2) Staff notes
CREATE TABLE public.crm_guest_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.crm_guests(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'preference', 'complaint', 'compliment', 'medical', 'alert')),
  is_pinned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  is_alert BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_notes_guest ON public.crm_guest_notes (guest_id);
ALTER TABLE public.crm_guest_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage guest notes"
ON public.crm_guest_notes FOR ALL TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- 3) Custom tags
CREATE TABLE public.crm_guest_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  emoji TEXT,
  is_system BOOLEAN DEFAULT false,
  auto_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

ALTER TABLE public.crm_guest_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their tags"
ON public.crm_guest_tags FOR ALL TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- 4) Tag assignments
CREATE TABLE public.crm_guest_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.crm_guests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_guest_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guest_id, tag_id)
);

CREATE INDEX idx_crm_tag_assign_guest ON public.crm_guest_tag_assignments (guest_id);
ALTER TABLE public.crm_guest_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage tag assignments"
ON public.crm_guest_tag_assignments FOR ALL TO authenticated
USING (
  guest_id IN (SELECT g.id FROM public.crm_guests g JOIN public.businesses b ON g.business_id = b.id WHERE b.user_id = auth.uid())
)
WITH CHECK (
  guest_id IN (SELECT g.id FROM public.crm_guests g JOIN public.businesses b ON g.business_id = b.id WHERE b.user_id = auth.uid())
);

-- 5) Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_crm_guests_updated_at BEFORE UPDATE ON public.crm_guests
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER trg_crm_notes_updated_at BEFORE UPDATE ON public.crm_guest_notes
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

-- 6) RPC function for guest stats (plpgsql to avoid parse-time validation)
CREATE OR REPLACE FUNCTION public.get_crm_guest_stats(p_business_id UUID)
RETURNS TABLE(
  guest_id UUID,
  total_visits BIGINT,
  total_spend_cents BIGINT,
  total_no_shows BIGINT,
  total_cancellations BIGINT,
  first_visit TIMESTAMPTZ,
  last_visit TIMESTAMPTZ,
  avg_party_size NUMERIC,
  favorite_table TEXT,
  total_reservations BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH guest_reservations AS (
    SELECT 
      cg.id AS g_id,
      r.status,
      r.party_size,
      r.created_at AS r_created
    FROM crm_guests cg
    JOIN reservations r ON (
      (cg.user_id IS NOT NULL AND r.user_id = cg.user_id)
      OR (cg.user_id IS NULL AND r.reservation_name = cg.guest_name)
    )
    LEFT JOIN events e ON r.event_id = e.id
    WHERE (e.business_id = p_business_id OR r.event_id IS NULL)
    AND cg.business_id = p_business_id
  ),
  visit_stats AS (
    SELECT 
      g_id,
      COUNT(*) FILTER (WHERE status = 'accepted') AS v_visits,
      COUNT(*) FILTER (WHERE status = 'declined') AS v_noshows,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS v_cancels,
      COUNT(*) AS v_total,
      AVG(party_size) FILTER (WHERE status = 'accepted') AS v_party,
      MIN(r_created) FILTER (WHERE status = 'accepted') AS v_first,
      MAX(r_created) FILTER (WHERE status = 'accepted') AS v_last
    FROM guest_reservations
    GROUP BY g_id
  ),
  ticket_spend AS (
    SELECT 
      cg.id AS g_id,
      COALESCE(SUM(tor.total_cents), 0) AS spend
    FROM crm_guests cg
    JOIN ticket_orders tor ON cg.user_id = tor.user_id AND tor.business_id = p_business_id
    WHERE cg.user_id IS NOT NULL
      AND cg.business_id = p_business_id
      AND tor.status = 'completed'
    GROUP BY cg.id
  ),
  fav_table AS (
    SELECT DISTINCT ON (sub.g_id) sub.g_id, sub.tbl_label AS fav
    FROM (
      SELECT cg.id AS g_id, fpt.label AS tbl_label, COUNT(*) AS cnt
      FROM crm_guests cg
      JOIN reservations r ON cg.user_id IS NOT NULL AND r.user_id = cg.user_id
      JOIN reservation_table_assignments rta ON r.id = rta.reservation_id
      JOIN floor_plan_tables fpt ON rta.table_id = fpt.id
      WHERE fpt.business_id = p_business_id AND cg.business_id = p_business_id
      GROUP BY cg.id, fpt.label
    ) sub
    ORDER BY sub.g_id, sub.cnt DESC
  )
  SELECT
    cg.id,
    COALESCE(vs.v_visits, 0)::BIGINT,
    COALESCE(ts.spend, 0)::BIGINT,
    COALESCE(vs.v_noshows, 0)::BIGINT,
    COALESCE(vs.v_cancels, 0)::BIGINT,
    vs.v_first,
    vs.v_last,
    ROUND(COALESCE(vs.v_party, 0), 1),
    ft.fav,
    COALESCE(vs.v_total, 0)::BIGINT
  FROM crm_guests cg
  LEFT JOIN visit_stats vs ON cg.id = vs.g_id
  LEFT JOIN ticket_spend ts ON cg.id = ts.g_id
  LEFT JOIN fav_table ft ON cg.id = ft.g_id
  WHERE cg.business_id = p_business_id;
END;
$$;
