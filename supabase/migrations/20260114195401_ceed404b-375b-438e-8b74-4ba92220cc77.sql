-- Add student discount settings to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS student_discount_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS student_discount_percent integer CHECK (student_discount_percent >= 1 AND student_discount_percent <= 100),
ADD COLUMN IF NOT EXISTS student_discount_mode text CHECK (student_discount_mode IN ('once', 'unlimited'));

-- Create table to track student redemptions per business
CREATE TABLE IF NOT EXISTS public.student_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
  scanned_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id, redeemed_at)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_redemptions_user_business 
ON public.student_redemptions(user_id, business_id);

CREATE INDEX IF NOT EXISTS idx_student_redemptions_business 
ON public.student_redemptions(business_id);

-- Enable RLS
ALTER TABLE public.student_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_redemptions
CREATE POLICY "Users can view their own redemptions"
ON public.student_redemptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view redemptions for their business"
ON public.student_redemptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = student_redemptions.business_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can insert redemptions"
ON public.student_redemptions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = student_redemptions.business_id 
    AND user_id = auth.uid()
  )
);

-- Add verification_token column to student_verifications for email verification
ALTER TABLE public.student_verifications
ADD COLUMN IF NOT EXISTS verification_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_student_verifications_token 
ON public.student_verifications(verification_token) 
WHERE verification_token IS NOT NULL;