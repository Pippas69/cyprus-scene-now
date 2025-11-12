-- Add missing columns to profiles and businesses tables

-- Add is_admin to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add verification fields to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS verification_notes TEXT;