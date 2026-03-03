
-- ============================================
-- 1. VENUES - Pre-built theatre venue library
-- ============================================
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  floor_plan_url TEXT,
  description TEXT,
  phone TEXT,
  website TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Venues are publicly readable (anyone browsing can see them)
CREATE POLICY "Anyone can view active venues"
  ON public.venues FOR SELECT
  USING (is_active = true);

-- Only admins can manage venues (via service role / edge functions)
-- No insert/update/delete policies for regular users

-- ============================================
-- 2. VENUE_ZONES - Sections within a venue
--    e.g. Orchestra, Balcony, Mezzanine, Box
-- ============================================
CREATE TABLE public.venue_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- hex color for rendering on floor plan
  sort_order INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venue zones"
  ON public.venue_zones FOR SELECT
  USING (true);

-- ============================================
-- 3. VENUE_SEATS - Every individual seat
-- ============================================
CREATE TABLE public.venue_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.venue_zones(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,       -- e.g. 'A', 'B', 'AA'
  seat_number INTEGER NOT NULL,  -- e.g. 1, 2, 3
  seat_label TEXT,               -- display label override e.g. 'A12'
  x REAL NOT NULL DEFAULT 0,    -- x coordinate on floor plan SVG
  y REAL NOT NULL DEFAULT 0,    -- y coordinate on floor plan SVG
  seat_type TEXT NOT NULL DEFAULT 'standard', -- standard, wheelchair, companion, restricted_view
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, row_label, seat_number)
);

ALTER TABLE public.venue_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venue seats"
  ON public.venue_seats FOR SELECT
  USING (is_active = true);

CREATE INDEX idx_venue_seats_venue ON public.venue_seats(venue_id);
CREATE INDEX idx_venue_seats_zone ON public.venue_seats(zone_id);

-- ============================================
-- 4. PRODUCTIONS - Parent entity for shows
-- ============================================
CREATE TABLE public.productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_urls TEXT[],
  duration_minutes INTEGER,
  intermission_count INTEGER DEFAULT 0,
  intermission_duration_minutes INTEGER,
  intermission_refreshments BOOLEAN DEFAULT false,
  min_age_hint INTEGER,
  tags TEXT[],
  category TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
  cover_image_url TEXT,
  group_booking_enabled BOOLEAN DEFAULT false,
  group_min_size INTEGER DEFAULT 10,
  group_discount_percent NUMERIC(5,2),
  group_contact_email TEXT,
  group_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;

-- Anyone can view published productions
CREATE POLICY "Anyone can view published productions"
  ON public.productions FOR SELECT
  USING (status = 'published');

-- Business owners can manage their own productions
CREATE POLICY "Business owners can insert productions"
  ON public.productions FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Business owners can update their productions"
  ON public.productions FOR UPDATE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Business owners can delete their productions"
  ON public.productions FOR DELETE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Business owners can also SELECT their own drafts
CREATE POLICY "Business owners can view own productions"
  ON public.productions FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE INDEX idx_productions_business ON public.productions(business_id);

-- ============================================
-- 5. PRODUCTION_CAST - Cast & crew credits
-- ============================================
CREATE TABLE public.production_cast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  role_name TEXT,          -- e.g. 'Hamlet', 'Lighting Design'
  role_type TEXT NOT NULL DEFAULT 'actor', -- actor, director, playwright, composer, choreographer, designer, crew
  photo_url TEXT,
  bio TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_cast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view production cast"
  ON public.production_cast FOR SELECT
  USING (true);

CREATE POLICY "Business owners can manage cast"
  ON public.production_cast FOR INSERT
  TO authenticated
  WITH CHECK (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update cast"
  ON public.production_cast FOR UPDATE
  TO authenticated
  USING (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete cast"
  ON public.production_cast FOR DELETE
  TO authenticated
  USING (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE INDEX idx_production_cast_production ON public.production_cast(production_id);

-- ============================================
-- 6. SHOW_INSTANCES - Specific dates/times
-- ============================================
CREATE TABLE public.show_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL, -- optional link to existing events table
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  doors_open_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, on_sale, sold_out, cancelled, completed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.show_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scheduled show instances"
  ON public.show_instances FOR SELECT
  USING (status IN ('scheduled', 'on_sale', 'sold_out', 'completed'));

CREATE POLICY "Business owners can view own show instances"
  ON public.show_instances FOR SELECT
  TO authenticated
  USING (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert show instances"
  ON public.show_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update show instances"
  ON public.show_instances FOR UPDATE
  TO authenticated
  USING (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete show instances"
  ON public.show_instances FOR DELETE
  TO authenticated
  USING (
    production_id IN (
      SELECT p.id FROM public.productions p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE INDEX idx_show_instances_production ON public.show_instances(production_id);
CREATE INDEX idx_show_instances_venue ON public.show_instances(venue_id);
CREATE INDEX idx_show_instances_start ON public.show_instances(start_at);

-- ============================================
-- 7. SHOW_INSTANCE_SEATS - Per-show seat map
--    Links a venue seat to a show + tier + status
-- ============================================
CREATE TABLE public.show_instance_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_instance_id UUID NOT NULL REFERENCES public.show_instances(id) ON DELETE CASCADE,
  venue_seat_id UUID NOT NULL REFERENCES public.venue_seats(id),
  ticket_tier_id UUID REFERENCES public.ticket_tiers(id),
  price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available', -- available, held, sold, blocked
  ticket_id UUID REFERENCES public.tickets(id),
  held_until TIMESTAMPTZ,
  held_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(show_instance_id, venue_seat_id)
);

ALTER TABLE public.show_instance_seats ENABLE ROW LEVEL SECURITY;

-- Anyone can view seat availability (needed for seat selection UI)
CREATE POLICY "Anyone can view show instance seats"
  ON public.show_instance_seats FOR SELECT
  USING (true);

-- Business owners can manage seats for their shows
CREATE POLICY "Business owners can insert show seats"
  ON public.show_instance_seats FOR INSERT
  TO authenticated
  WITH CHECK (
    show_instance_id IN (
      SELECT si.id FROM public.show_instances si
      JOIN public.productions p ON p.id = si.production_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update show seats"
  ON public.show_instance_seats FOR UPDATE
  TO authenticated
  USING (
    show_instance_id IN (
      SELECT si.id FROM public.show_instances si
      JOIN public.productions p ON p.id = si.production_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

-- Also allow authenticated users to update seats they are holding (for checkout)
CREATE POLICY "Users can update their held seats"
  ON public.show_instance_seats FOR UPDATE
  TO authenticated
  USING (held_by = auth.uid() AND status = 'held');

CREATE INDEX idx_show_seats_instance ON public.show_instance_seats(show_instance_id);
CREATE INDEX idx_show_seats_status ON public.show_instance_seats(show_instance_id, status);
CREATE INDEX idx_show_seats_held ON public.show_instance_seats(held_until) WHERE status = 'held';

-- ============================================
-- 8. SHOW_ZONE_PRICING - Zone-level pricing per show
--    So each venue's zones can have different prices per show
-- ============================================
CREATE TABLE public.show_zone_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_instance_id UUID NOT NULL REFERENCES public.show_instances(id) ON DELETE CASCADE,
  venue_zone_id UUID NOT NULL REFERENCES public.venue_zones(id),
  ticket_tier_id UUID REFERENCES public.ticket_tiers(id),
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(show_instance_id, venue_zone_id)
);

ALTER TABLE public.show_zone_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view zone pricing"
  ON public.show_zone_pricing FOR SELECT
  USING (true);

CREATE POLICY "Business owners can manage zone pricing"
  ON public.show_zone_pricing FOR INSERT
  TO authenticated
  WITH CHECK (
    show_instance_id IN (
      SELECT si.id FROM public.show_instances si
      JOIN public.productions p ON p.id = si.production_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update zone pricing"
  ON public.show_zone_pricing FOR UPDATE
  TO authenticated
  USING (
    show_instance_id IN (
      SELECT si.id FROM public.show_instances si
      JOIN public.productions p ON p.id = si.production_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE b.user_id = auth.uid()
    )
  );
