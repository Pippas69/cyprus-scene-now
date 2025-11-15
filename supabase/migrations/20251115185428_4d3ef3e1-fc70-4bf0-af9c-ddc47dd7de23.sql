-- Create the event-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read event cover images (public bucket)
CREATE POLICY "Public read access for event covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-covers');

-- Allow authenticated users to upload event covers
CREATE POLICY "Authenticated users can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers');

-- Allow users to delete their own event covers
CREATE POLICY "Users can delete their own event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  auth.uid()::text = split_part(name, '-', 1)
);