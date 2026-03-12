
-- RPC to look up offer data via reservation_guests QR token
-- This handles the case where an offer was claimed with a reservation,
-- and per-guest QR codes come from reservation_guests table
CREATE OR REPLACE FUNCTION public.get_offer_by_reservation_guest_token(p_token text)
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
    rg.id,
    rg.qr_code_token,
    rg.guest_name,
    op.status as purchase_status,
    op.created_at as purchase_created_at,
    op.expires_at as purchase_expires_at,
    op.redeemed_at as purchase_redeemed_at,
    d.title as discount_title,
    d.percent_off as discount_percent,
    d.offer_type,
    b.name as business_name,
    b.logo_url as business_logo_url
  FROM reservation_guests rg
  JOIN reservations r ON r.id = rg.reservation_id
  JOIN offer_purchases op ON op.reservation_id = r.id
  JOIN discounts d ON d.id = op.discount_id
  JOIN businesses b ON b.id = d.business_id
  WHERE rg.qr_code_token = p_token
  LIMIT 1;
$$;
