-- Allow updating brief values when the funnel is shared and brief is not approved
CREATE POLICY "Anyone can update brief via shared funnel if not approved"
ON public.funnel_briefs
FOR UPDATE
TO anon, authenticated
USING (
  is_approved = false
  AND funnel_id IN (
    SELECT id FROM public.funnels WHERE share_token IS NOT NULL AND share_token <> ''
  )
)
WITH CHECK (
  is_approved = false
  AND funnel_id IN (
    SELECT id FROM public.funnels WHERE share_token IS NOT NULL AND share_token <> ''
  )
);