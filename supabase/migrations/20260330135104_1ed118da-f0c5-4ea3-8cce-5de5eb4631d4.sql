CREATE OR REPLACE FUNCTION public.get_user_cities(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, city text, town text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id AS user_id, p.city, p.town
  FROM profiles p
  WHERE p.id = ANY(p_user_ids);
$$;