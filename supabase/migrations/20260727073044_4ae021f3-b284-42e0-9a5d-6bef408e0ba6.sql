CREATE TABLE public.growth_stages (
  stage TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  typical_profile TEXT NOT NULL DEFAULT '',
  unlock_condition TEXT NOT NULL DEFAULT '',
  focus TEXT NOT NULL DEFAULT '',
  success_criteria TEXT NOT NULL DEFAULT '',
  bottleneck TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  milestone TEXT NOT NULL DEFAULT '',
  ai_guidance TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.growth_stages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_stages TO authenticated;
GRANT ALL ON public.growth_stages TO service_role;
ALTER TABLE public.growth_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_stages_read_all" ON public.growth_stages FOR SELECT USING (true);
CREATE POLICY "growth_stages_admin_write" ON public.growth_stages FOR ALL TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE TRIGGER growth_stages_set_updated_at BEFORE UPDATE ON public.growth_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.growth_systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  addresses TEXT NOT NULL DEFAULT '',
  stage_relevance TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  related_module TEXT,
  ai_guidance TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.growth_systems TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_systems TO authenticated;
GRANT ALL ON public.growth_systems TO service_role;
ALTER TABLE public.growth_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_systems_read_all" ON public.growth_systems FOR SELECT USING (true);
CREATE POLICY "growth_systems_admin_write" ON public.growth_systems FOR ALL TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE TRIGGER growth_systems_set_updated_at BEFORE UPDATE ON public.growth_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON COLUMN public.growth_stages.ai_guidance IS 'Admin-editable domain knowledge for AI Actions. Never rendered to users.';
COMMENT ON COLUMN public.growth_systems.ai_guidance IS 'Admin-editable domain knowledge for AI Actions. Never rendered to users.';