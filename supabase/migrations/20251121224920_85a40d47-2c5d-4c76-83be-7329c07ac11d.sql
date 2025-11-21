-- Create discount_scans table to track all QR code scan attempts
CREATE TABLE IF NOT EXISTS public.discount_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_type TEXT NOT NULL DEFAULT 'view', -- 'view', 'verify', 'redeem'
  device_info JSONB,
  location_info JSONB,
  success BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on discount_scans
ALTER TABLE public.discount_scans ENABLE ROW LEVEL SECURITY;

-- Business owners can view scans for their offers
CREATE POLICY "Business owners can view their discount scans"
ON public.discount_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM discounts d
    INNER JOIN businesses b ON b.id = d.business_id
    WHERE d.id = discount_scans.discount_id
    AND b.user_id = auth.uid()
  )
);

-- Anyone can insert scan records (for tracking)
CREATE POLICY "Anyone can insert scan records"
ON public.discount_scans
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discount_scans_discount_id ON public.discount_scans(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_scans_scanned_at ON public.discount_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_discount_scans_scan_type ON public.discount_scans(scan_type);

-- Create a view for discount scan statistics
CREATE OR REPLACE VIEW discount_scan_stats AS
SELECT 
  d.id as discount_id,
  d.title,
  d.business_id,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'view') as total_views,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'verify') as total_verifications,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.scan_type = 'redeem') as total_redemptions,
  COUNT(DISTINCT ds.id) as total_scans,
  COUNT(DISTINCT ds.scanned_by) as unique_scanners,
  MAX(ds.scanned_at) as last_scanned_at,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.scanned_at >= NOW() - INTERVAL '24 hours') as scans_last_24h,
  COUNT(DISTINCT ds.id) FILTER (WHERE ds.scanned_at >= NOW() - INTERVAL '7 days') as scans_last_7d
FROM discounts d
LEFT JOIN discount_scans ds ON ds.discount_id = d.id
GROUP BY d.id, d.title, d.business_id;

-- Grant access to the view
GRANT SELECT ON discount_scan_stats TO authenticated;