-- 1. Status column on copy_documents
ALTER TABLE public.copy_documents ADD COLUMN IF NOT EXISTS status text;

-- 2. Helper: is a copy document part of a publicly-shared funnel?
CREATE OR REPLACE FUNCTION public.copy_document_is_public(_doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.copy_documents d
    JOIN public.funnels f ON f.id = d.funnel_id
    WHERE d.id = _doc_id
      AND f.share_token IS NOT NULL
  )
$$;

GRANT EXECUTE ON FUNCTION public.copy_document_is_public(uuid) TO anon, authenticated;

-- 3. Storage RLS for copy-assets bucket
-- Path convention: {sub_account_id}/{copy_document_id}/{filename}

DROP POLICY IF EXISTS "copy_assets member read" ON storage.objects;
DROP POLICY IF EXISTS "copy_assets member insert" ON storage.objects;
DROP POLICY IF EXISTS "copy_assets member update" ON storage.objects;
DROP POLICY IF EXISTS "copy_assets member delete" ON storage.objects;
DROP POLICY IF EXISTS "copy_assets public read" ON storage.objects;

CREATE POLICY "copy_assets member read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'copy-assets'
    AND public.is_sub_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "copy_assets member insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'copy-assets'
    AND public.is_sub_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "copy_assets member update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'copy-assets'
    AND public.is_sub_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "copy_assets member delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'copy-assets'
    AND public.is_sub_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Anonymous read for assets attached to publicly-shared funnels
CREATE POLICY "copy_assets public read"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'copy-assets'
    AND public.copy_document_is_public(((storage.foldername(name))[2])::uuid)
  );