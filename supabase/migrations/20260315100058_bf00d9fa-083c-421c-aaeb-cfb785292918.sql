
-- Funnels table
CREATE TABLE public.funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Funnel',
  description text DEFAULT '',
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_template boolean NOT NULL DEFAULT false,
  template_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own funnels
CREATE POLICY "Users can manage own funnels"
ON public.funnels FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can read templates (public templates by admins)
CREATE POLICY "Users can read templates"
ON public.funnels FOR SELECT TO authenticated
USING (is_template = true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_funnel_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER funnel_updated_at
BEFORE UPDATE ON public.funnels
FOR EACH ROW EXECUTE FUNCTION public.update_funnel_updated_at();
