-- Create reservation_scans table to track QR code scan attempts for analytics
CREATE TABLE IF NOT EXISTS public.reservation_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_type TEXT NOT NULL DEFAULT 'check_in', -- 'check_in', 'verify'
  device_info JSONB,
  success BOOLEAN NOT NULL DEFAULT true
);

-- Add check-in tracking columns to reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id);

-- Enable RLS
ALTER TABLE public.reservation_scans ENABLE ROW LEVEL SECURITY;

-- Business owners can view scans for their reservations
CREATE POLICY "Business owners can view their reservation scans"
ON public.reservation_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    LEFT JOIN events e ON r.event_id = e.id
    LEFT JOIN businesses b ON (r.business_id = b.id OR e.business_id = b.id)
    WHERE r.id = reservation_scans.reservation_id
    AND b.user_id = auth.uid()
  )
);

-- Business owners can insert scans for their reservations
CREATE POLICY "Business owners can insert scans for their reservations"
ON public.reservation_scans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reservations r
    LEFT JOIN events e ON r.event_id = e.id
    LEFT JOIN businesses b ON (r.business_id = b.id OR e.business_id = b.id)
    WHERE r.id = reservation_scans.reservation_id
    AND b.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reservation_scans_reservation_id ON public.reservation_scans(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_scans_scanned_at ON public.reservation_scans(scanned_at DESC);

-- Enable realtime for reservation_scans
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_scans;