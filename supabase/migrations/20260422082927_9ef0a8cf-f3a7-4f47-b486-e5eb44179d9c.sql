-- Add support for "comp guests" (free invitations attached to an existing reservation)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS parent_reservation_id uuid NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_comp boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reservations_parent_reservation_id
  ON public.reservations(parent_reservation_id)
  WHERE parent_reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_is_comp
  ON public.reservations(is_comp)
  WHERE is_comp = true;

COMMENT ON COLUMN public.reservations.parent_reservation_id IS 'If set, this reservation is a comp (free invitation) attached to the referenced parent reservation.';
COMMENT ON COLUMN public.reservations.is_comp IS 'True if this reservation row represents a free comp guest added by the business owner.';