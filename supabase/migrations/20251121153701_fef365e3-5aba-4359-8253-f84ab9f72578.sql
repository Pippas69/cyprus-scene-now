-- Add gender column to profiles table
ALTER TABLE profiles 
ADD COLUMN gender TEXT;

COMMENT ON COLUMN profiles.gender IS 'User gender (male, female, non-binary, prefer-not-to-say, or NULL)';