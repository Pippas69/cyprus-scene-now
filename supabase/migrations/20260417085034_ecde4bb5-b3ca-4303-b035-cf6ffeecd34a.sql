
CREATE OR REPLACE FUNCTION public.get_promoter_applicants_for_business(_business_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  first_name text,
  last_name text,
  avatar_url text,
  city text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.first_name, p.last_name, p.avatar_url, p.city, p.email
  FROM public.profiles p
  WHERE p.id IN (
    SELECT pa.promoter_user_id
    FROM public.promoter_applications pa
    WHERE pa.business_id = _business_id
  )
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id AND b.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_promoter_applicants_for_business(uuid) TO authenticated;
