
-- Create storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-documents', 'knowledge-documents', false);

-- Only admins can upload/read/delete files
CREATE POLICY "Admins can upload knowledge files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read knowledge files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete knowledge files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'admin'));

-- Update knowledge_documents table: add file fields, drop content
ALTER TABLE public.knowledge_documents
  ADD COLUMN file_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN file_path TEXT NOT NULL DEFAULT '',
  ADD COLUMN file_size BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'application/pdf';

ALTER TABLE public.knowledge_documents DROP COLUMN content;
