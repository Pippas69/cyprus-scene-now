-- Create event_posts table
CREATE TABLE public.event_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create post_reactions table
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.event_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'fire', 'laugh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX idx_event_posts_event_id ON public.event_posts(event_id);
CREATE INDEX idx_event_posts_created_at ON public.event_posts(created_at DESC);
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);

-- Enable RLS
ALTER TABLE public.event_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_posts

-- Attendees (RSVP'd users) can view posts
CREATE POLICY "Attendees can view event posts"
ON public.event_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rsvps
    WHERE rsvps.event_id = event_posts.event_id
    AND rsvps.user_id = auth.uid()
  )
);

-- Attendees can create posts
CREATE POLICY "Attendees can create event posts"
ON public.event_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM rsvps
    WHERE rsvps.event_id = event_posts.event_id
    AND rsvps.user_id = auth.uid()
  )
);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.event_posts FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for post_reactions

-- Attendees can view reactions
CREATE POLICY "Attendees can view reactions"
ON public.post_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM event_posts ep
    JOIN rsvps ON rsvps.event_id = ep.event_id
    WHERE ep.id = post_reactions.post_id
    AND rsvps.user_id = auth.uid()
  )
);

-- Attendees can add reactions
CREATE POLICY "Attendees can add reactions"
ON public.post_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM event_posts ep
    JOIN rsvps ON rsvps.event_id = ep.event_id
    WHERE ep.id = post_reactions.post_id
    AND rsvps.user_id = auth.uid()
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.post_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;