-- Create enum for post types
CREATE TYPE public.business_post_type AS ENUM (
  'announcement',
  'photo',
  'video',
  'poll',
  'behind_the_scenes',
  'story'
);

-- Create enum for post visibility
CREATE TYPE public.post_visibility AS ENUM (
  'public',
  'followers',
  'private'
);

-- Create business_posts table
CREATE TABLE public.business_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  post_type public.business_post_type NOT NULL DEFAULT 'announcement',
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  visibility public.post_visibility NOT NULL DEFAULT 'public',
  is_pinned BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  poll_question TEXT,
  poll_options JSONB DEFAULT '[]',
  poll_ends_at TIMESTAMP WITH TIME ZONE,
  poll_multiple_choice BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll votes table
CREATE TABLE public.business_post_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, option_index)
);

-- Create post likes table
CREATE TABLE public.business_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post views table (for analytics)
CREATE TABLE public.business_post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_post_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_post_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_posts
CREATE POLICY "Public posts are viewable by everyone"
ON public.business_posts FOR SELECT
USING (
  visibility = 'public' 
  AND (published_at IS NULL OR published_at <= now())
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Business owners can view all their posts"
ON public.business_posts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = business_posts.business_id AND b.user_id = auth.uid()
));

CREATE POLICY "Verified business owners can create posts"
ON public.business_posts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = business_posts.business_id 
  AND b.user_id = auth.uid() 
  AND b.verified = true
));

CREATE POLICY "Business owners can update their posts"
ON public.business_posts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = business_posts.business_id AND b.user_id = auth.uid()
));

CREATE POLICY "Business owners can delete their posts"
ON public.business_posts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = business_posts.business_id AND b.user_id = auth.uid()
));

-- RLS Policies for poll votes
CREATE POLICY "Users can vote on polls"
ON public.business_post_poll_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view poll votes"
ON public.business_post_poll_votes FOR SELECT
USING (true);

CREATE POLICY "Users can remove their vote"
ON public.business_post_poll_votes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Users can like posts"
ON public.business_post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes"
ON public.business_post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can unlike posts"
ON public.business_post_likes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for views
CREATE POLICY "Anyone can record views"
ON public.business_post_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Business owners can view their post analytics"
ON public.business_post_views FOR SELECT
USING (EXISTS (
  SELECT 1 FROM business_posts bp
  JOIN businesses b ON b.id = bp.business_id
  WHERE bp.id = business_post_views.post_id AND b.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_business_posts_business_id ON public.business_posts(business_id);
CREATE INDEX idx_business_posts_post_type ON public.business_posts(post_type);
CREATE INDEX idx_business_posts_published_at ON public.business_posts(published_at);
CREATE INDEX idx_business_posts_scheduled_at ON public.business_posts(scheduled_at);
CREATE INDEX idx_business_post_likes_post_id ON public.business_post_likes(post_id);
CREATE INDEX idx_business_post_views_post_id ON public.business_post_views(post_id);

-- Create trigger for updated_at
CREATE TRIGGER update_business_posts_updated_at
BEFORE UPDATE ON public.business_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for business_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_posts;