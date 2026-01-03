-- Add waitlist flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_waitlist boolean DEFAULT false;

-- Add index for quick waitlist queries
CREATE INDEX IF NOT EXISTS idx_profiles_waitlist ON public.profiles(is_waitlist) WHERE is_waitlist = true;