-- 1) Backfill legacy rows so old assignments get linked to their reservation's event
UPDATE public.reservation_table_assignments AS rta
SET event_id = r.event_id
FROM public.reservations AS r
WHERE rta.reservation_id = r.id
  AND rta.event_id IS NULL
  AND r.event_id IS NOT NULL;

-- 2) Remove old global uniqueness (caused duplicate key on reservation_id across event-scoped inserts)
ALTER TABLE public.reservation_table_assignments
DROP CONSTRAINT IF EXISTS reservation_table_assignments_reservation_id_key;

-- 3) Enforce per-event uniqueness for reservation assignment
ALTER TABLE public.reservation_table_assignments
DROP CONSTRAINT IF EXISTS reservation_table_assignments_reservation_event_unique;

ALTER TABLE public.reservation_table_assignments
ADD CONSTRAINT reservation_table_assignments_reservation_event_unique
UNIQUE (reservation_id, event_id);

-- 4) Keep safe uniqueness for legacy NULL-event rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_rta_reservation_null_event_unique
ON public.reservation_table_assignments (reservation_id)
WHERE event_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rta_table_null_event_unique
ON public.reservation_table_assignments (table_id)
WHERE event_id IS NULL;