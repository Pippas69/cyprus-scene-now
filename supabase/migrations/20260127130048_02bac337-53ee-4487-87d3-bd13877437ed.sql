-- Add offer_image_url column to discounts table
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS offer_image_url TEXT;

-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offer-images',
  'offer-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for offer-images bucket

-- Policy: Anyone can view offer images (public bucket)
CREATE POLICY "Offer images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'offer-images');

-- Policy: Business owners can upload offer images
CREATE POLICY "Business owners can upload offer images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE user_id = auth.uid()
  )
);

-- Policy: Business owners can update their offer images
CREATE POLICY "Business owners can update offer images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE user_id = auth.uid()
  )
);

-- Policy: Business owners can delete their offer images
CREATE POLICY "Business owners can delete offer images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE user_id = auth.uid()
  )
);