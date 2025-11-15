-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reservation_name TEXT NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 50),
  seating_preference TEXT CHECK (seating_preference IN ('indoor', 'outdoor', 'no_preference')),
  preferred_time TIMESTAMP WITH TIME ZONE,
  phone_number TEXT,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  business_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add reservation settings to events table
ALTER TABLE public.events 
  ADD COLUMN accepts_reservations BOOLEAN DEFAULT false,
  ADD COLUMN max_reservations INTEGER,
  ADD COLUMN requires_approval BOOLEAN DEFAULT true,
  ADD COLUMN seating_options TEXT[] DEFAULT ARRAY['indoor', 'outdoor'];

-- Enable RLS on reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "Users can view their own reservations"
  ON public.reservations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view reservations for their events"
  ON public.reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.businesses b ON e.business_id = b.id
      WHERE e.id = reservations.event_id 
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create reservations"
  ON public.reservations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reservations"
  ON public.reservations
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Business owners can update reservations for their events"
  ON public.reservations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.businesses b ON e.business_id = b.id
      WHERE e.id = reservations.event_id 
      AND b.user_id = auth.uid()
      AND b.verified = true
    )
  );

-- Indexes for better performance
CREATE INDEX idx_reservations_event_id ON public.reservations(event_id);
CREATE INDEX idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_events_accepts_reservations ON public.events(accepts_reservations) WHERE accepts_reservations = true;

-- Trigger for updated_at
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();