ALTER TABLE public.events ADD COLUMN archived_at timestamptz DEFAULT NULL;

CREATE INDEX idx_events_archived_at ON public.events (archived_at) WHERE archived_at IS NULL;

CREATE POLICY "Business owners can archive their own events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
)
WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
);