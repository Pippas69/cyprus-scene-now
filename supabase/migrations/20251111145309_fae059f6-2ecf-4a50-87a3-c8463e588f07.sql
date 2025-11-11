-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types
CREATE TYPE app_role AS ENUM ('user', 'business', 'admin');
CREATE TYPE rsvp_status AS ENUM ('interested', 'going');
CREATE TYPE entity_type AS ENUM ('event', 'business', 'discount');
CREATE TYPE price_tier AS ENUM ('free', 'low', 'medium', 'high');

-- Users/Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  name TEXT NOT NULL,
  dob_year INTEGER,
  dob_month INTEGER CHECK (dob_month >= 1 AND dob_month <= 12),
  city TEXT,
  interests TEXT[],
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT[] NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT NOT NULL,
  geo GEOGRAPHY(POINT, 4326),
  phone TEXT,
  website TEXT,
  verified BOOLEAN DEFAULT false,
  logo_url TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT[] NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  cover_image_url TEXT,
  min_age_hint INTEGER,
  price_tier price_tier DEFAULT 'free',
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RSVPs table
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Realtime stats table
CREATE TABLE public.realtime_stats (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  interested_count INTEGER DEFAULT 0,
  going_count INTEGER DEFAULT 0,
  age_bucket_15_17 INTEGER DEFAULT 0,
  age_bucket_18_24 INTEGER DEFAULT 0,
  age_bucket_25_34 INTEGER DEFAULT 0,
  age_bucket_35_44 INTEGER DEFAULT 0,
  age_bucket_45_60 INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discounts table
CREATE TABLE public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  percent_off INTEGER CHECK (percent_off > 0 AND percent_off <= 100),
  qr_code_token TEXT UNIQUE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  terms TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Redemptions table
CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified BOOLEAN DEFAULT false
);

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Featured content table
CREATE TABLE public.featured (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  weight INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table (for event chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for businesses
CREATE POLICY "Businesses are viewable by everyone" ON public.businesses
  FOR SELECT USING (true);

CREATE POLICY "Business owners can insert their business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owners can update their business" ON public.businesses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Business owners can delete their business" ON public.businesses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Business owners can create events" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their events" ON public.events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their events" ON public.events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for rsvps
CREATE POLICY "Anyone can view RSVPs" ON public.rsvps
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can RSVP" ON public.rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs" ON public.rsvps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSVPs" ON public.rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for realtime_stats
CREATE POLICY "Stats are viewable by everyone" ON public.realtime_stats
  FOR SELECT USING (true);

-- RLS Policies for discounts
CREATE POLICY "Active discounts are viewable by everyone" ON public.discounts
  FOR SELECT USING (active = true);

CREATE POLICY "Business owners can create discounts" ON public.discounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = discounts.business_id
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their discounts" ON public.discounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = discounts.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for redemptions
CREATE POLICY "Users can view their own redemptions" ON public.redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions" ON public.redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for posts
CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Business owners can create posts" ON public.posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = posts.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for featured
CREATE POLICY "Featured content is viewable by everyone" ON public.featured
  FOR SELECT USING (true);

-- RLS Policies for messages
CREATE POLICY "Event messages are viewable by everyone" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Authenticated users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update realtime stats
CREATE OR REPLACE FUNCTION update_realtime_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_age INTEGER;
  user_birth_year INTEGER;
  user_birth_month INTEGER;
BEGIN
  -- Initialize stats if not exists
  INSERT INTO public.realtime_stats (event_id, interested_count, going_count)
  VALUES (COALESCE(NEW.event_id, OLD.event_id), 0, 0)
  ON CONFLICT (event_id) DO NOTHING;

  -- Get user's birth year and month
  SELECT dob_year, dob_month INTO user_birth_year, user_birth_month
  FROM public.profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Calculate age
  IF user_birth_year IS NOT NULL AND user_birth_month IS NOT NULL THEN
    user_age := EXTRACT(YEAR FROM AGE(
      MAKE_DATE(user_birth_year, user_birth_month, 1)
    ));
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Increment counters
    IF NEW.status = 'interested' THEN
      UPDATE public.realtime_stats
      SET interested_count = interested_count + 1,
          age_bucket_15_17 = CASE WHEN user_age >= 15 AND user_age <= 17 THEN age_bucket_15_17 + 1 ELSE age_bucket_15_17 END,
          age_bucket_18_24 = CASE WHEN user_age >= 18 AND user_age <= 24 THEN age_bucket_18_24 + 1 ELSE age_bucket_18_24 END,
          age_bucket_25_34 = CASE WHEN user_age >= 25 AND user_age <= 34 THEN age_bucket_25_34 + 1 ELSE age_bucket_25_34 END,
          age_bucket_35_44 = CASE WHEN user_age >= 35 AND user_age <= 44 THEN age_bucket_35_44 + 1 ELSE age_bucket_35_44 END,
          age_bucket_45_60 = CASE WHEN user_age >= 45 AND user_age <= 60 THEN age_bucket_45_60 + 1 ELSE age_bucket_45_60 END,
          updated_at = NOW()
      WHERE event_id = NEW.event_id;
    ELSE
      UPDATE public.realtime_stats
      SET going_count = going_count + 1,
          age_bucket_15_17 = CASE WHEN user_age >= 15 AND user_age <= 17 THEN age_bucket_15_17 + 1 ELSE age_bucket_15_17 END,
          age_bucket_18_24 = CASE WHEN user_age >= 18 AND user_age <= 24 THEN age_bucket_18_24 + 1 ELSE age_bucket_18_24 END,
          age_bucket_25_34 = CASE WHEN user_age >= 25 AND user_age <= 34 THEN age_bucket_25_34 + 1 ELSE age_bucket_25_34 END,
          age_bucket_35_44 = CASE WHEN user_age >= 35 AND user_age <= 34 THEN age_bucket_35_44 + 1 ELSE age_bucket_35_44 END,
          age_bucket_45_60 = CASE WHEN user_age >= 45 AND user_age <= 60 THEN age_bucket_45_60 + 1 ELSE age_bucket_45_60 END,
          updated_at = NOW()
      WHERE event_id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update counters on status change
    IF OLD.status != NEW.status THEN
      IF OLD.status = 'interested' THEN
        UPDATE public.realtime_stats
        SET interested_count = interested_count - 1,
            going_count = going_count + 1,
            updated_at = NOW()
        WHERE event_id = NEW.event_id;
      ELSE
        UPDATE public.realtime_stats
        SET interested_count = interested_count + 1,
            going_count = going_count - 1,
            updated_at = NOW()
        WHERE event_id = NEW.event_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counters
    IF OLD.status = 'interested' THEN
      UPDATE public.realtime_stats
      SET interested_count = GREATEST(0, interested_count - 1),
          age_bucket_15_17 = CASE WHEN user_age >= 15 AND user_age <= 17 THEN GREATEST(0, age_bucket_15_17 - 1) ELSE age_bucket_15_17 END,
          age_bucket_18_24 = CASE WHEN user_age >= 18 AND user_age <= 24 THEN GREATEST(0, age_bucket_18_24 - 1) ELSE age_bucket_18_24 END,
          age_bucket_25_34 = CASE WHEN user_age >= 25 AND user_age <= 34 THEN GREATEST(0, age_bucket_25_34 - 1) ELSE age_bucket_25_34 END,
          age_bucket_35_44 = CASE WHEN user_age >= 35 AND user_age <= 44 THEN GREATEST(0, age_bucket_35_44 - 1) ELSE age_bucket_35_44 END,
          age_bucket_45_60 = CASE WHEN user_age >= 45 AND user_age <= 60 THEN GREATEST(0, age_bucket_45_60 - 1) ELSE age_bucket_45_60 END,
          updated_at = NOW()
      WHERE event_id = OLD.event_id;
    ELSE
      UPDATE public.realtime_stats
      SET going_count = GREATEST(0, going_count - 1),
          age_bucket_15_17 = CASE WHEN user_age >= 15 AND user_age <= 17 THEN GREATEST(0, age_bucket_15_17 - 1) ELSE age_bucket_15_17 END,
          age_bucket_18_24 = CASE WHEN user_age >= 18 AND user_age <= 24 THEN GREATEST(0, age_bucket_18_24 - 1) ELSE age_bucket_18_24 END,
          age_bucket_25_34 = CASE WHEN user_age >= 25 AND user_age <= 34 THEN GREATEST(0, age_bucket_25_34 - 1) ELSE age_bucket_25_34 END,
          age_bucket_35_44 = CASE WHEN user_age >= 35 AND user_age <= 44 THEN GREATEST(0, age_bucket_35_44 - 1) ELSE age_bucket_35_44 END,
          age_bucket_45_60 = CASE WHEN user_age >= 45 AND user_age <= 60 THEN GREATEST(0, age_bucket_45_60 - 1) ELSE age_bucket_45_60 END,
          updated_at = NOW()
      WHERE event_id = OLD.event_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating realtime stats
CREATE TRIGGER rsvp_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.rsvps
FOR EACH ROW EXECUTE FUNCTION update_realtime_stats();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;