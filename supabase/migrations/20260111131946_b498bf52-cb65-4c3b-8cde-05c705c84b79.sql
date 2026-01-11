-- Phase 1: Complete Events System Database Schema
-- ================================================

-- 1.1 Add new columns to events table for event types and appearance
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN ('ticket', 'reservation', 'free_entry')),
ADD COLUMN IF NOT EXISTS appearance_mode TEXT DEFAULT 'date_range' CHECK (appearance_mode IN ('date_range', 'hourly')),
ADD COLUMN IF NOT EXISTS appearance_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appearance_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reservation_hours_from TIME,
ADD COLUMN IF NOT EXISTS reservation_hours_to TIME,
ADD COLUMN IF NOT EXISTS min_party_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_party_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_total_reservations INTEGER,
ADD COLUMN IF NOT EXISTS free_entry_declaration BOOLEAN DEFAULT FALSE;

-- 1.2 Create reservation_seating_types table
CREATE TABLE IF NOT EXISTS public.reservation_seating_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seating_type TEXT NOT NULL CHECK (seating_type IN ('bar', 'table', 'vip', 'sofa')),
  available_slots INTEGER NOT NULL DEFAULT 1,
  slots_booked INTEGER NOT NULL DEFAULT 0,
  dress_code TEXT CHECK (dress_code IN ('casual', 'smart_casual', 'elegant', 'no_sportswear')),
  cancellation_policy TEXT,
  no_show_policy TEXT DEFAULT 'non_refundable' CHECK (no_show_policy IN ('refundable', 'partial_refund', 'non_refundable')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, seating_type)
);

-- 1.3 Create seating_type_tiers table for price tiers
CREATE TABLE IF NOT EXISTS public.seating_type_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seating_type_id UUID NOT NULL REFERENCES public.reservation_seating_types(id) ON DELETE CASCADE,
  min_people INTEGER NOT NULL,
  max_people INTEGER NOT NULL,
  prepaid_min_charge_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (min_people > 0),
  CHECK (max_people >= min_people),
  CHECK (prepaid_min_charge_cents > 0)
);

-- 1.4 Add columns to reservations table for prepaid tracking
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS seating_type_id UUID REFERENCES public.reservation_seating_types(id),
ADD COLUMN IF NOT EXISTS prepaid_min_charge_cents INTEGER,
ADD COLUMN IF NOT EXISTS prepaid_charge_status TEXT DEFAULT 'pending' CHECK (prepaid_charge_status IN ('pending', 'paid', 'refunded', 'no_show')),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 1.5 Add dress_code to ticket_tiers table
ALTER TABLE public.ticket_tiers
ADD COLUMN IF NOT EXISTS dress_code TEXT CHECK (dress_code IN ('casual', 'smart_casual', 'elegant', 'no_sportswear'));

-- 1.6 Create free_entry_reports table for anti-abuse
CREATE TABLE IF NOT EXISTS public.free_entry_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id),
  report_reason TEXT NOT NULL,
  details TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.7 Add strike columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS free_entry_strikes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_entry_boost_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS free_entry_creation_banned BOOLEAN DEFAULT FALSE;

-- 1.8 Enable RLS on new tables
ALTER TABLE public.reservation_seating_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seating_type_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_entry_reports ENABLE ROW LEVEL SECURITY;

-- 1.9 RLS Policies for reservation_seating_types
CREATE POLICY "Anyone can view seating types for events"
ON public.reservation_seating_types FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage their event seating types"
ON public.reservation_seating_types FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.businesses b ON e.business_id = b.id
    WHERE e.id = reservation_seating_types.event_id
    AND b.user_id = auth.uid()
  )
);

-- 1.10 RLS Policies for seating_type_tiers
CREATE POLICY "Anyone can view seating type tiers"
ON public.seating_type_tiers FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage their seating type tiers"
ON public.seating_type_tiers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.reservation_seating_types rst
    JOIN public.events e ON rst.event_id = e.id
    JOIN public.businesses b ON e.business_id = b.id
    WHERE rst.id = seating_type_tiers.seating_type_id
    AND b.user_id = auth.uid()
  )
);

-- 1.11 RLS Policies for free_entry_reports
CREATE POLICY "Users can create reports"
ON public.free_entry_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view their own reports"
ON public.free_entry_reports FOR SELECT
USING (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can view and manage all reports"
ON public.free_entry_reports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 1.12 Function to decrement seating slots atomically
CREATE OR REPLACE FUNCTION public.decrement_seating_slots(p_seating_type_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available INTEGER;
  v_booked INTEGER;
BEGIN
  SELECT available_slots, slots_booked INTO v_available, v_booked
  FROM reservation_seating_types
  WHERE id = p_seating_type_id
  FOR UPDATE;
  
  IF v_booked >= v_available THEN
    RETURN FALSE;
  END IF;
  
  UPDATE reservation_seating_types
  SET slots_booked = slots_booked + 1, updated_at = now()
  WHERE id = p_seating_type_id;
  
  RETURN TRUE;
END;
$$;

-- 1.13 Function to get available seating for an event
CREATE OR REPLACE FUNCTION public.get_event_seating_availability(p_event_id UUID)
RETURNS TABLE (
  seating_type_id UUID,
  seating_type TEXT,
  available_slots INTEGER,
  slots_booked INTEGER,
  remaining_slots INTEGER,
  dress_code TEXT,
  min_price_cents INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rst.id as seating_type_id,
    rst.seating_type,
    rst.available_slots,
    rst.slots_booked,
    (rst.available_slots - rst.slots_booked) as remaining_slots,
    rst.dress_code,
    MIN(stt.prepaid_min_charge_cents)::INTEGER as min_price_cents
  FROM reservation_seating_types rst
  LEFT JOIN seating_type_tiers stt ON stt.seating_type_id = rst.id
  WHERE rst.event_id = p_event_id
  GROUP BY rst.id, rst.seating_type, rst.available_slots, rst.slots_booked, rst.dress_code;
END;
$$;

-- 1.14 Function to get price for party size
CREATE OR REPLACE FUNCTION public.get_seating_price_for_party(
  p_seating_type_id UUID,
  p_party_size INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price INTEGER;
BEGIN
  SELECT prepaid_min_charge_cents INTO v_price
  FROM seating_type_tiers
  WHERE seating_type_id = p_seating_type_id
    AND p_party_size >= min_people
    AND p_party_size <= max_people
  ORDER BY min_people ASC
  LIMIT 1;
  
  RETURN v_price;
END;
$$;

-- 1.15 Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_seating_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seating_type_tiers;