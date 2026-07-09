CREATE POLICY "Anyone can view analytics entries via funnel share_token"
  ON public.funnel_analytics_entries
  FOR SELECT
  TO anon, authenticated
  USING (
    funnel_id IN (
      SELECT id FROM public.funnels WHERE share_token IS NOT NULL AND share_token <> ''
    )
  );

CREATE POLICY "Anyone can view step metrics via funnel share_token"
  ON public.funnel_step_metrics
  FOR SELECT
  TO anon, authenticated
  USING (
    entry_id IN (
      SELECT e.id
      FROM public.funnel_analytics_entries e
      JOIN public.funnels f ON f.id = e.funnel_id
      WHERE f.share_token IS NOT NULL AND f.share_token <> ''
    )
  );

GRANT SELECT ON public.funnel_analytics_entries TO anon;
GRANT SELECT ON public.funnel_step_metrics TO anon;