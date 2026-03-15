
-- Analytics entries table (one row per funnel per day)
CREATE TABLE public.funnel_analytics_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, date)
);

ALTER TABLE public.funnel_analytics_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own analytics entries"
  ON public.funnel_analytics_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step metrics table (one row per node per entry)
CREATE TABLE public.funnel_step_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.funnel_analytics_entries(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_label text NOT NULL DEFAULT '',
  node_type text NOT NULL DEFAULT '',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, node_id)
);

ALTER TABLE public.funnel_step_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own step metrics"
  ON public.funnel_step_metrics
  FOR ALL
  TO authenticated
  USING (entry_id IN (SELECT id FROM public.funnel_analytics_entries WHERE user_id = auth.uid()))
  WITH CHECK (entry_id IN (SELECT id FROM public.funnel_analytics_entries WHERE user_id = auth.uid()));
