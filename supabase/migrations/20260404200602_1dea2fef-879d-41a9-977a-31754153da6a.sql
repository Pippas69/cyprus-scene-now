CREATE OR REPLACE FUNCTION public.get_business_reservation_emails(
  p_business_id uuid,
  p_reservation_ids uuid[]
)
RETURNS TABLE (
  reservation_id uuid,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS reservation_id,
    CASE
      WHEN COALESCE(r.is_manual_entry, false)
        THEN NULLIF(trim(COALESCE(r.email, '')), '')
      ELSE COALESCE(
        NULLIF(trim(COALESCE(r.email, '')), ''),
        NULLIF(trim(COALESCE(p.email, '')), '')
      )
    END AS email
  FROM public.reservations r
  LEFT JOIN public.profiles p
    ON p.id = r.user_id
  WHERE r.id = ANY(COALESCE(p_reservation_ids, ARRAY[]::uuid[]))
    AND (
      EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id = p_business_id
          AND b.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
    AND (
      (r.event_id IS NULL AND r.business_id = p_business_id)
      OR (
        r.event_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = r.event_id
            AND e.business_id = p_business_id
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_business_reservation_emails(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_reservation_emails(uuid, uuid[]) TO authenticated;