
-- Build Guides core
CREATE TABLE public.build_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.build_guides TO authenticated;
GRANT ALL ON public.build_guides TO service_role;
ALTER TABLE public.build_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Build guides readable" ON public.build_guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage build guides" ON public.build_guides FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE TRIGGER trg_build_guides_updated BEFORE UPDATE ON public.build_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stages
CREATE TABLE public.build_guide_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_guide_id uuid NOT NULL REFERENCES public.build_guides(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_build_guide_stages_guide ON public.build_guide_stages(build_guide_id, sort_order);
GRANT SELECT ON public.build_guide_stages TO authenticated;
GRANT ALL ON public.build_guide_stages TO service_role;
ALTER TABLE public.build_guide_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stages readable" ON public.build_guide_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stages" ON public.build_guide_stages FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE TRIGGER trg_build_guide_stages_updated BEFORE UPDATE ON public.build_guide_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tasks
CREATE TABLE public.build_guide_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.build_guide_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description_md text,
  instructions_url text,
  video_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_build_guide_tasks_stage ON public.build_guide_tasks(stage_id, sort_order);
GRANT SELECT ON public.build_guide_tasks TO authenticated;
GRANT ALL ON public.build_guide_tasks TO service_role;
ALTER TABLE public.build_guide_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks readable" ON public.build_guide_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tasks" ON public.build_guide_tasks FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE TRIGGER trg_build_guide_tasks_updated BEFORE UPDATE ON public.build_guide_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Growth System <-> Build Guide junction
CREATE TABLE public.growth_system_build_guides (
  growth_system_id uuid NOT NULL REFERENCES public.growth_systems_catalog(id) ON DELETE CASCADE,
  build_guide_id uuid NOT NULL REFERENCES public.build_guides(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (growth_system_id, build_guide_id)
);
GRANT SELECT ON public.growth_system_build_guides TO authenticated;
GRANT ALL ON public.growth_system_build_guides TO service_role;
ALTER TABLE public.growth_system_build_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System-guides readable" ON public.growth_system_build_guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage system-guides" ON public.growth_system_build_guides FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

-- Acquisition Channel <-> Build Guide junction
CREATE TABLE public.acquisition_channel_build_guides (
  acquisition_channel_id uuid NOT NULL REFERENCES public.acquisition_channels(id) ON DELETE CASCADE,
  build_guide_id uuid NOT NULL REFERENCES public.build_guides(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (acquisition_channel_id, build_guide_id)
);
GRANT SELECT ON public.acquisition_channel_build_guides TO authenticated;
GRANT ALL ON public.acquisition_channel_build_guides TO service_role;
ALTER TABLE public.acquisition_channel_build_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channel-guides readable" ON public.acquisition_channel_build_guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage channel-guides" ON public.acquisition_channel_build_guides FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

-- Route <-> Funnel + Seed Template entry node + Roadmap target system
ALTER TABLE public.growth_architecture_systems
  ADD COLUMN funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX ux_growth_arch_funnel ON public.growth_architecture_systems(funnel_id) WHERE funnel_id IS NOT NULL;

ALTER TABLE public.seed_templates ADD COLUMN entry_node_id text;

ALTER TABLE public.growth_roadmap_tasks
  ADD COLUMN target_growth_system_id uuid REFERENCES public.growth_systems_catalog(id) ON DELETE SET NULL;

-- Funnel <-> Build Guides snapshot
CREATE TABLE public.funnel_build_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  build_guide_id uuid NOT NULL REFERENCES public.build_guides(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('system','channel')),
  source_ref_id uuid,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funnel_id, build_guide_id)
);
CREATE INDEX ix_funnel_build_guides_funnel ON public.funnel_build_guides(funnel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_build_guides TO authenticated;
GRANT ALL ON public.funnel_build_guides TO service_role;
ALTER TABLE public.funnel_build_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read funnel-guides" ON public.funnel_build_guides FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_guides.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));
CREATE POLICY "Members insert funnel-guides" ON public.funnel_build_guides FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_guides.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));
CREATE POLICY "Members delete funnel-guides" ON public.funnel_build_guides FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_guides.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));

-- Task progress
CREATE TABLE public.funnel_build_task_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.build_guide_tasks(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  UNIQUE (funnel_id, task_id)
);
CREATE INDEX ix_funnel_task_progress_funnel ON public.funnel_build_task_progress(funnel_id);
CREATE INDEX ix_funnel_task_progress_task ON public.funnel_build_task_progress(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_build_task_progress TO authenticated;
GRANT ALL ON public.funnel_build_task_progress TO service_role;
ALTER TABLE public.funnel_build_task_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read task progress" ON public.funnel_build_task_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_task_progress.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));
CREATE POLICY "Members insert task progress" ON public.funnel_build_task_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_task_progress.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));
CREATE POLICY "Members update task progress" ON public.funnel_build_task_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_task_progress.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_task_progress.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));
CREATE POLICY "Members delete task progress" ON public.funnel_build_task_progress FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_build_task_progress.funnel_id AND public.is_sub_account_member(auth.uid(), f.sub_account_id)));

-- Enable realtime for offers (stale-offer fix)
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
