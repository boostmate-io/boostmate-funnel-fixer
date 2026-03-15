
-- Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Project',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add project_id to funnels (nullable for existing data)
ALTER TABLE public.funnels ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add project_id to assets (nullable for existing data)
ALTER TABLE public.assets ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_funnel_updated_at();
