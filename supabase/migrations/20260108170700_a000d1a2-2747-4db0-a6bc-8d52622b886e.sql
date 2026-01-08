-- Add direct reservation columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS accepts_direct_reservations boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reservation_capacity_type text DEFAULT 'daily' CHECK (reservation_capacity_type IN ('daily', 'time_slots')),
ADD COLUMN IF NOT EXISTS daily_reservation_limit integer,
ADD COLUMN IF NOT EXISTS reservation_time_slots jsonb,
ADD COLUMN IF NOT EXISTS reservation_days text[],
ADD COLUMN IF NOT EXISTS reservation_opens_at time,
ADD COLUMN IF NOT EXISTS reservation_closes_at time,
ADD COLUMN IF NOT EXISTS reservation_seating_options text[],
ADD COLUMN IF NOT EXISTS reservation_requires_approval boolean DEFAULT true;

-- Add business_id to reservations table and make event_id nullable
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
ALTER COLUMN event_id DROP NOT NULL;

-- Add constraint to ensure either event_id OR business_id is set (but not both null)
ALTER TABLE public.reservations
ADD CONSTRAINT reservations_event_or_business_check 
CHECK (event_id IS NOT NULL OR business_id IS NOT NULL);

-- Create index for direct reservations
CREATE INDEX IF NOT EXISTS idx_reservations_business_id ON public.reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_reservations_preferred_time ON public.reservations(preferred_time);

-- RLS policies for direct reservations
CREATE POLICY "Users can create direct reservations for businesses that accept them"
ON public.reservations
FOR INSERT
WITH CHECK (
  (business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_id AND accepts_direct_reservations = true
  ))
  OR event_id IS NOT NULL
);

-- Create RPC function to get business available capacity for a specific date
CREATE OR REPLACE FUNCTION public.get_business_available_capacity(
  p_business_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business record;
  v_day_name text;
  v_existing_count integer;
  v_result jsonb;
BEGIN
  -- Get business reservation settings
  SELECT 
    accepts_direct_reservations,
    reservation_capacity_type,
    daily_reservation_limit,
    reservation_time_slots,
    reservation_days,
    reservation_opens_at,
    reservation_closes_at
  INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  -- Check if business accepts direct reservations
  IF NOT v_business.accepts_direct_reservations THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Business does not accept direct reservations');
  END IF;

  -- Get day name from date
  v_day_name := lower(to_char(p_date, 'fmDay'));

  -- Check if the day is in the available days
  IF v_business.reservation_days IS NOT NULL AND NOT (v_day_name = ANY(v_business.reservation_days)) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Business is closed for reservations on this day');
  END IF;

  -- Count existing reservations for this date
  SELECT COUNT(*)
  INTO v_existing_count
  FROM reservations
  WHERE business_id = p_business_id
    AND DATE(preferred_time) = p_date
    AND status NOT IN ('cancelled', 'declined');

  -- Return capacity info based on type
  IF v_business.reservation_capacity_type = 'daily' THEN
    RETURN jsonb_build_object(
      'available', true,
      'capacity_type', 'daily',
      'total_capacity', COALESCE(v_business.daily_reservation_limit, 999),
      'used_capacity', v_existing_count,
      'remaining_capacity', GREATEST(0, COALESCE(v_business.daily_reservation_limit, 999) - v_existing_count),
      'opens_at', v_business.reservation_opens_at,
      'closes_at', v_business.reservation_closes_at
    );
  ELSE
    -- For time slots, return the slots configuration
    RETURN jsonb_build_object(
      'available', true,
      'capacity_type', 'time_slots',
      'time_slots', v_business.reservation_time_slots,
      'opens_at', v_business.reservation_opens_at,
      'closes_at', v_business.reservation_closes_at
    );
  END IF;
END;
$$;