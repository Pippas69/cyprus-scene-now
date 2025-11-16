-- Create storage bucket for event cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for event-covers bucket

-- Policy: Anyone can view event cover images (public bucket)
CREATE POLICY "Event covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-covers');

-- Policy: Verified business owners can upload event covers
CREATE POLICY "Verified businesses can upload event covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-covers' AND
  auth.uid() IN (
    SELECT user_id FROM businesses WHERE verified = true
  )
);

-- Policy: Verified business owners can update their event covers
CREATE POLICY "Verified businesses can update event covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-covers' AND
  auth.uid() IN (
    SELECT user_id FROM businesses WHERE verified = true
  )
);

-- Policy: Verified business owners can delete their event covers
CREATE POLICY "Verified businesses can delete event covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-covers' AND
  auth.uid() IN (
    SELECT user_id FROM businesses WHERE verified = true
  )
);