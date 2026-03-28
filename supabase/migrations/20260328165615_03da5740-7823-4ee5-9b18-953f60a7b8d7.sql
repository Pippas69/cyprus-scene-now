
-- Add manual entry columns to reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_manual_entry boolean NOT NULL DEFAULT false;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS manual_status text DEFAULT null;

-- Add manual entry column to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_manual_entry boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS manual_status text DEFAULT null;

-- RLS: Business owners can INSERT manual reservations for their own business
CREATE POLICY "Business owners can manually add reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (
    is_manual_entry = true AND (
      (business_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
      ))
      OR (event_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.events e JOIN public.businesses b ON e.business_id = b.id
        WHERE e.id = event_id AND b.user_id = auth.uid()
      ))
    )
  );

-- RLS: Business owners can UPDATE manual_status on their manual entries
CREATE POLICY "Business owners can update manual entry status"
  ON public.reservations FOR UPDATE TO authenticated
  USING (
    is_manual_entry = true AND (
      (business_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
      ))
      OR (event_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.events e JOIN public.businesses b ON e.business_id = b.id
        WHERE e.id = event_id AND b.user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    is_manual_entry = true AND (
      (business_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()
      ))
      OR (event_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.events e JOIN public.businesses b ON e.business_id = b.id
        WHERE e.id = event_id AND b.user_id = auth.uid()
      ))
    )
  );

-- RLS: Business owners can INSERT manual tickets for their own events
CREATE POLICY "Business owners can manually add tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (
    is_manual_entry = true AND
    event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.events e JOIN public.businesses b ON e.business_id = b.id
      WHERE e.id = event_id AND b.user_id = auth.uid()
    )
  );

-- RLS: Business owners can UPDATE manual ticket status
CREATE POLICY "Business owners can update manual ticket status"
  ON public.tickets FOR UPDATE TO authenticated
  USING (
    is_manual_entry = true AND
    event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.events e JOIN public.businesses b ON e.business_id = b.id
      WHERE e.id = event_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_manual_entry = true AND
    event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.events e JOIN public.businesses b ON e.business_id = b.id
      WHERE e.id = event_id AND b.user_id = auth.uid()
    )
  );
