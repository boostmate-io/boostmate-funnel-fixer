-- Link share link to a saved analytics view so the shared page always reflects live view config
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS shared_view_id uuid;

-- Allow anonymous/public read of a saved analytics view when it is bound to a funnel with an active share_token
CREATE POLICY "Public can read saved view referenced by shared funnel"
ON public.analytics_saved_views
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.funnels f
    WHERE f.shared_view_id = analytics_saved_views.id
      AND f.share_token IS NOT NULL
  )
);

GRANT SELECT ON public.analytics_saved_views TO anon;