-- Add is_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add verification tracking to businesses table
ALTER TABLE public.businesses 
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;

-- Create index for pending businesses
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON public.businesses(verified) WHERE verified = FALSE;