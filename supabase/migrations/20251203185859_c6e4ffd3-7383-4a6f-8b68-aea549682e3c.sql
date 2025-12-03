-- Add onboarding_completed column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;