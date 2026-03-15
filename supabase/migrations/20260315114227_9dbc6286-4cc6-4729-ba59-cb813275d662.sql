-- Create audits table (user-level, not project-level)
CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_audience text NOT NULL DEFAULT '',
  offer text NOT NULL DEFAULT '',
  landing_page_url text NOT NULL DEFAULT '',
  traffic_source text NOT NULL DEFAULT '',
  monthly_traffic text NOT NULL DEFAULT '',
  conversion_rate text NOT NULL DEFAULT '',
  funnel_strategy text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  score integer,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own audits"
ON public.audits FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_audit_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_funnel_updated_at();