-- Create the floor-plan-references storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plan-references', 'floor-plan-references', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload floor plan references"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'floor-plan-references');

-- Allow authenticated users to update (upsert)
CREATE POLICY "Authenticated users can update floor plan references"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'floor-plan-references');

-- Allow authenticated users to delete their references
CREATE POLICY "Authenticated users can delete floor plan references"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'floor-plan-references');

-- Allow public read access for floor plan references
CREATE POLICY "Public read access for floor plan references"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'floor-plan-references');