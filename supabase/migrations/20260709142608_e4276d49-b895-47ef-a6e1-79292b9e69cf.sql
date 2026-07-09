
CREATE TABLE public.analytics_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_saved_views_funnel ON public.analytics_saved_views(funnel_id);
CREATE INDEX idx_analytics_saved_views_sub_account ON public.analytics_saved_views(sub_account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_saved_views TO authenticated;
GRANT ALL ON public.analytics_saved_views TO service_role;

ALTER TABLE public.analytics_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage saved views"
  ON public.analytics_saved_views FOR ALL
  USING ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()))
  WITH CHECK ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()));

CREATE POLICY "Users can manage own saved views"
  ON public.analytics_saved_views FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_analytics_saved_views_updated_at
  BEFORE UPDATE ON public.analytics_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
