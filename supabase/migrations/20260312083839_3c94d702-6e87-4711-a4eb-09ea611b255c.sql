
-- RPC to look up reservation data via reservation_guests QR token
CREATE OR REPLACE FUNCTION public.get_reservation_by_guest_token(p_token text)
RETURNS TABLE (
  reservation_id uuid,
  qr_code_token text,
  guest_name text,
  reservation_name text,
  party_size integer,
  preferred_time timestamptz,
  event_start_at timestamptz,
  event_title text,
  business_name text,
  business_logo text,
  checked_in_at timestamptz,
  guest_checked_in_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id as reservation_id,
    rg.qr_code_token,
    rg.guest_name,
    r.reservation_name,
    r.party_size,
    r.preferred_time,
    e.start_at as event_start_at,
    e.title as event_title,
    b.name as business_name,
    b.logo_url as business_logo,
    r.checked_in_at,
    rg.checked_in_at as guest_checked_in_at,
    r.status
  FROM reservation_guests rg
  JOIN reservations r ON r.id = rg.reservation_id
  LEFT JOIN events e ON e.id = r.event_id
  LEFT JOIN businesses b ON b.id = COALESCE(r.business_id, e.business_id)
  WHERE rg.qr_code_token = p_token
  LIMIT 1;
$$;
