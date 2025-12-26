-- Create user_connections table for tracking friend/connection requests
CREATE TABLE public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id),
  CHECK (requester_id != receiver_id)
);

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own connections (sent or received)
CREATE POLICY "Users can view own connections"
ON public.user_connections
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Users can send connection requests
CREATE POLICY "Users can send connection requests"
ON public.user_connections
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Users can update connections they're part of (accept/decline/block)
CREATE POLICY "Users can update own connections"
ON public.user_connections
FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Users can delete their own sent requests or accepted connections
CREATE POLICY "Users can delete own connections"
ON public.user_connections
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Create index for faster lookups
CREATE INDEX idx_user_connections_requester ON public.user_connections(requester_id);
CREATE INDEX idx_user_connections_receiver ON public.user_connections(receiver_id);
CREATE INDEX idx_user_connections_status ON public.user_connections(status);

-- Function to calculate similarity score between two users
CREATE OR REPLACE FUNCTION public.calculate_user_similarity(user1_id UUID, user2_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score INTEGER := 0;
  user1_interests TEXT[];
  user2_interests TEXT[];
  user1_city TEXT;
  user2_city TEXT;
  shared_events INTEGER;
BEGIN
  -- Get user interests and cities
  SELECT interests, city INTO user1_interests, user1_city FROM profiles WHERE id = user1_id;
  SELECT interests, city INTO user2_interests, user2_city FROM profiles WHERE id = user2_id;
  
  -- Score for shared interests (10 points each, max 50)
  IF user1_interests IS NOT NULL AND user2_interests IS NOT NULL THEN
    score := score + LEAST(
      (SELECT COUNT(*) FROM unnest(user1_interests) i1 WHERE i1 = ANY(user2_interests))::INTEGER * 10,
      50
    );
  END IF;
  
  -- Score for same city (20 points)
  IF user1_city IS NOT NULL AND user2_city IS NOT NULL AND user1_city = user2_city THEN
    score := score + 20;
  END IF;
  
  -- Score for attending same events (5 points each, max 30)
  SELECT COUNT(*) INTO shared_events
  FROM rsvps r1
  JOIN rsvps r2 ON r1.event_id = r2.event_id
  WHERE r1.user_id = user1_id 
    AND r2.user_id = user2_id
    AND r1.status IN ('going', 'interested')
    AND r2.status IN ('going', 'interested');
  
  score := score + LEAST(shared_events * 5, 30);
  
  RETURN score;
END;
$$;

-- Function to get similar users for a given user
CREATE OR REPLACE FUNCTION public.get_similar_users(target_user_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  city TEXT,
  interests TEXT[],
  similarity_score INTEGER,
  connection_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.name, p.first_name || ' ' || p.last_name) AS name,
    p.avatar_url,
    p.city,
    p.interests,
    public.calculate_user_similarity(target_user_id, p.id) AS similarity_score,
    (
      SELECT uc.status 
      FROM user_connections uc 
      WHERE (uc.requester_id = target_user_id AND uc.receiver_id = p.id)
         OR (uc.receiver_id = target_user_id AND uc.requester_id = p.id)
      LIMIT 1
    ) AS connection_status
  FROM profiles p
  WHERE p.id != target_user_id
    AND p.role = 'user'
    AND public.calculate_user_similarity(target_user_id, p.id) > 0
  ORDER BY similarity_score DESC
  LIMIT limit_count;
END;
$$;

-- Function to get users attending a specific event with similarity scores
CREATE OR REPLACE FUNCTION public.get_event_attendees_with_similarity(event_id_param UUID, current_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  city TEXT,
  interests TEXT[],
  rsvp_status TEXT,
  similarity_score INTEGER,
  connection_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.name, p.first_name || ' ' || p.last_name) AS name,
    p.avatar_url,
    p.city,
    p.interests,
    r.status::TEXT AS rsvp_status,
    CASE 
      WHEN current_user_id IS NULL THEN 0
      ELSE public.calculate_user_similarity(current_user_id, p.id)
    END AS similarity_score,
    (
      SELECT uc.status 
      FROM user_connections uc 
      WHERE (uc.requester_id = current_user_id AND uc.receiver_id = p.id)
         OR (uc.receiver_id = current_user_id AND uc.requester_id = p.id)
      LIMIT 1
    ) AS connection_status
  FROM rsvps r
  JOIN profiles p ON r.user_id = p.id
  WHERE r.event_id = event_id_param
  ORDER BY 
    CASE WHEN r.status = 'going' THEN 0 ELSE 1 END,
    similarity_score DESC;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();