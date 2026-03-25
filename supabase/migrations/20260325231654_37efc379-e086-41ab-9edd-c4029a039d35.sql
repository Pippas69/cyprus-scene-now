
-- Create ghost origin trigger
CREATE OR REPLACE FUNCTION public.set_ghost_brought_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_booker_user_id uuid;
  v_guest_crm_id uuid;
BEGIN
  SELECT COALESCE(r.business_id, e.business_id), r.user_id
  INTO v_business_id, v_booker_user_id
  FROM public.reservations r
  LEFT JOIN public.events e ON e.id = r.event_id
  WHERE r.id = NEW.reservation_id;

  IF v_business_id IS NULL OR v_booker_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cg.id INTO v_guest_crm_id
  FROM public.crm_guests cg
  WHERE cg.business_id = v_business_id
    AND cg.profile_type = 'ghost'
    AND cg.brought_by_user_id IS NULL
    AND public.normalize_guest_identity(cg.guest_name) = public.normalize_guest_identity(NEW.guest_name)
  LIMIT 1;

  IF v_guest_crm_id IS NOT NULL THEN
    UPDATE public.crm_guests SET brought_by_user_id = v_booker_user_id WHERE id = v_guest_crm_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ghost_brought_by ON public.reservation_guests;
CREATE TRIGGER trg_set_ghost_brought_by
  AFTER INSERT ON public.reservation_guests
  FOR EACH ROW EXECUTE FUNCTION public.set_ghost_brought_by();

-- Ghost-to-account merge function
CREATE OR REPLACE FUNCTION public.merge_ghost_to_account(
  p_ghost_id uuid, p_account_id uuid, p_business_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.crm_guest_tag_assignments SET guest_id = p_account_id
  WHERE guest_id = p_ghost_id
    AND NOT EXISTS (SELECT 1 FROM public.crm_guest_tag_assignments WHERE guest_id = p_account_id AND tag_id = crm_guest_tag_assignments.tag_id);
  UPDATE public.crm_guest_notes SET guest_id = p_account_id WHERE guest_id = p_ghost_id;
  UPDATE public.crm_guests SET merged_from = COALESCE(merged_from, '{}') || ARRAY[p_ghost_id::text] WHERE id = p_account_id;
  DELETE FROM public.crm_guest_tag_assignments WHERE guest_id = p_ghost_id;
  DELETE FROM public.crm_guests WHERE id = p_ghost_id;
END;
$$;

-- Backfill brought_by_user_id for existing ghosts
UPDATE public.crm_guests cg
SET brought_by_user_id = sub.booker_user_id
FROM (
  SELECT DISTINCT ON (cg2.id) cg2.id AS ghost_id, r.user_id AS booker_user_id
  FROM public.crm_guests cg2
  JOIN public.reservation_guests rg ON public.normalize_guest_identity(rg.guest_name) = public.normalize_guest_identity(cg2.guest_name)
  JOIN public.reservations r ON r.id = rg.reservation_id
  WHERE cg2.profile_type = 'ghost' AND cg2.brought_by_user_id IS NULL AND r.user_id IS NOT NULL
    AND (r.business_id = cg2.business_id OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = r.event_id AND e.business_id = cg2.business_id))
  ORDER BY cg2.id, r.created_at DESC
) sub
WHERE cg.id = sub.ghost_id;
