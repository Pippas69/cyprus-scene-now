-- Fix Critical Profile Email Exposure
-- The current RLS policy exposes ALL columns including email to public

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Public can view safe profile fields" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Ensure public_profiles view exists and only exposes safe fields
CREATE OR REPLACE VIEW public_profiles AS
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
FROM profiles;

-- Grant public access to the view only (NOT the profiles table)
GRANT SELECT ON public_profiles TO anon, authenticated;

-- Create secure policies: users can only view their OWN complete profile
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);