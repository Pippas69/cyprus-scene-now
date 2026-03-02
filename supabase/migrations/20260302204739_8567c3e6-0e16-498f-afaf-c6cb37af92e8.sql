-- Allow anyone (including anonymous/unauthenticated) to view a ticket by its qr_code_token
-- This is safe because qr_code_token is a long random hash (64 chars) that acts as a secret
CREATE POLICY "Anyone can view ticket by qr_code_token"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (true);

-- Drop the old user-only policy since the new one is more permissive for SELECT
-- Actually, keep the old one - it's fine to have both. The new broad policy covers all cases.
-- But we should be more restrictive. Let's replace with a narrower approach:
-- We'll allow public access only, the query will filter by qr_code_token on the client side.
-- Since RLS USING(true) allows reading ALL tickets, let's be smarter about it.

-- Actually, the qr_code_token is a 64-char hex hash, essentially unguessable.
-- But exposing all tickets via USING(true) to anon is too broad.
-- Better approach: use a database function.

-- Drop the overly permissive policy we just created
DROP POLICY IF EXISTS "Anyone can view ticket by qr_code_token" ON public.tickets;

-- Create a security definer function that returns ticket data by token
CREATE OR REPLACE FUNCTION public.get_ticket_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  qr_code_token text,
  guest_name text,
  guest_age integer,
  status text,
  checked_in_at timestamptz,
  tier_name text,
  event_title text,
  event_start_at timestamptz,
  event_location text,
  business_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.qr_code_token,
    t.guest_name,
    t.guest_age,
    t.status,
    t.checked_in_at,
    tt.name as tier_name,
    e.title as event_title,
    e.start_at as event_start_at,
    e.location as event_location,
    b.name as business_name
  FROM tickets t
  JOIN ticket_tiers tt ON tt.id = t.tier_id
  JOIN events e ON e.id = t.event_id
  JOIN businesses b ON b.id = e.business_id
  WHERE t.qr_code_token = p_token
  LIMIT 1;
$$;