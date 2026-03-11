
-- Security definer function to get reservation data by qr_code_token (public access)
CREATE OR REPLACE FUNCTION public.get_reservation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  qr_code_token text,
  reservation_name text,
  party_size integer,
  status text,
  checked_in_at timestamptz,
  confirmation_code text,
  preferred_time timestamptz,
  seating_preference text,
  event_title text,
  event_start_at timestamptz,
  event_location text,
  business_name text,
  business_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.qr_code_token,
    r.reservation_name,
    r.party_size,
    r.status,
    r.checked_in_at,
    r.confirmation_code,
    r.preferred_time,
    r.seating_preference,
    COALESCE(e.title, NULL) as event_title,
    e.start_at as event_start_at,
    COALESCE(e.location, b_direct.address) as event_location,
    COALESCE(b_event.name, b_direct.name) as business_name,
    COALESCE(b_event.logo_url, b_direct.logo_url) as business_logo_url
  FROM reservations r
  LEFT JOIN events e ON e.id = r.event_id
  LEFT JOIN businesses b_event ON b_event.id = e.business_id
  LEFT JOIN businesses b_direct ON b_direct.id = r.business_id
  WHERE r.qr_code_token = p_token
  LIMIT 1;
$$;

-- Security definer function to get offer purchase data by qr_code_token (public access)
CREATE OR REPLACE FUNCTION public.get_offer_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  qr_code_token text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  discount_title text,
  discount_percent integer,
  offer_type text,
  business_name text,
  business_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    op.id,
    op.qr_code_token,
    op.status,
    op.created_at,
    op.expires_at,
    op.redeemed_at,
    d.title as discount_title,
    d.percent_off as discount_percent,
    d.offer_type,
    b.name as business_name,
    b.logo_url as business_logo_url
  FROM offer_purchases op
  JOIN discounts d ON d.id = op.discount_id
  JOIN businesses b ON b.id = d.business_id
  WHERE op.qr_code_token = p_token
  LIMIT 1;
$$;

-- Also check offer_purchase_guests for per-guest tokens
CREATE OR REPLACE FUNCTION public.get_offer_guest_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  qr_code_token text,
  guest_name text,
  purchase_status text,
  purchase_created_at timestamptz,
  purchase_expires_at timestamptz,
  purchase_redeemed_at timestamptz,
  discount_title text,
  discount_percent integer,
  offer_type text,
  business_name text,
  business_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.qr_code_token,
    g.guest_name,
    op.status as purchase_status,
    op.created_at as purchase_created_at,
    op.expires_at as purchase_expires_at,
    op.redeemed_at as purchase_redeemed_at,
    d.title as discount_title,
    d.percent_off as discount_percent,
    d.offer_type,
    b.name as business_name,
    b.logo_url as business_logo_url
  FROM offer_purchase_guests g
  JOIN offer_purchases op ON op.id = g.purchase_id
  JOIN discounts d ON d.id = op.discount_id
  JOIN businesses b ON b.id = d.business_id
  WHERE g.qr_code_token = p_token
  LIMIT 1;
$$;
