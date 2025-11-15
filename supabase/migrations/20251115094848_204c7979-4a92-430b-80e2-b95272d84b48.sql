-- Create storage bucket for business cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-covers', 'business-covers', true);

-- RLS Policies for business-covers bucket
CREATE POLICY "Business covers are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-covers');

CREATE POLICY "Authenticated users can upload business covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-covers');

CREATE POLICY "Users can update their own business covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own business covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);