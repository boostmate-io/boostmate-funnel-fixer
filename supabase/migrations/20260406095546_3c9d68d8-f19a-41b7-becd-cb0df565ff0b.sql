
-- Create storage bucket for funnel element screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('funnel-screenshots', 'funnel-screenshots', true);

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload funnel screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'funnel-screenshots');

-- Allow public read access
CREATE POLICY "Funnel screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'funnel-screenshots');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own funnel screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'funnel-screenshots');
