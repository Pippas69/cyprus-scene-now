-- Create profile_boosts table for business profile boosting
CREATE TABLE public.profile_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  boost_tier public.boost_tier NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_mode text DEFAULT 'daily',
  duration_hours integer,
  daily_rate_cents integer NOT NULL,
  hourly_rate_cents integer,
  total_cost_cents integer NOT NULL,
  status public.boost_status DEFAULT 'scheduled',
  source public.boost_source NOT NULL,
  targeting_quality integer,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their own profile boosts
CREATE POLICY "Business owners can manage profile boosts"
  ON public.profile_boosts FOR ALL
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  ));

-- Anyone can view active profile boosts (for Feed display)
CREATE POLICY "Anyone can view active profile boosts"
  ON public.profile_boosts FOR SELECT
  USING (status = 'active');

-- Create trigger for updated_at
CREATE TRIGGER update_profile_boosts_updated_at
  BEFORE UPDATE ON public.profile_boosts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();