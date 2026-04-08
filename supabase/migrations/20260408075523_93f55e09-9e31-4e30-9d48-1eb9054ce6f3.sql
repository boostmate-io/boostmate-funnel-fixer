CREATE POLICY "Anyone can read brief via shared funnel"
ON public.funnel_briefs
FOR SELECT
TO anon, authenticated
USING (
  funnel_id IN (
    SELECT id FROM public.funnels WHERE share_token IS NOT NULL AND share_token <> ''
  )
);