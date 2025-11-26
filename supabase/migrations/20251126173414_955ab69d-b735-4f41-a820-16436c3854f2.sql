-- Create the public_profiles view that exposes only safe profile data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  name,
  first_name,
  last_name,
  avatar_url,
  city,
  town,
  interests,
  created_at,
  updated_at
FROM public.profiles;

-- Drop the overly permissive public policy on profiles
DROP POLICY IF EXISTS "Public can view safe profile fields" ON public.profiles;

-- Restrict profiles table to only authenticated users viewing their own data
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Grant public access to the safe public_profiles view
GRANT SELECT ON public.public_profiles TO anon, authenticated;