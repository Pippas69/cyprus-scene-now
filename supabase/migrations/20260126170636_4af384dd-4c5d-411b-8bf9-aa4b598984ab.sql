-- Allow users to cancel their own reservations even after they've been accepted
-- Fix: Postgres does not support CREATE POLICY IF NOT EXISTS

BEGIN;

DROP POLICY IF EXISTS "Users can cancel their own reservations" ON public.reservations;

CREATE POLICY "Users can cancel their own reservations"
ON public.reservations
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status IN ('pending', 'accepted')
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'
);

COMMIT;