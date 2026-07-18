
-- Growth Roadmap V2: task catalog + per-workspace progress.

-- Enum for task status per workspace.
DO $$ BEGIN
  CREATE TYPE public.growth_task_status AS ENUM ('locked','available','in_progress','completed','dismissed','snoozed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) Catalog: admin-managed roadmap tasks
-- ============================================================
CREATE TABLE public.growth_roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  -- Primary stage: one of the 5 canonical stages, or 'any' for cross-stage foundations.
  stage text NOT NULL CHECK (stage IN ('any','validate','attract','optimize','scale','systemize')),
  -- Optional additional stages this task legitimately belongs to.
  applicable_stages text[] NOT NULL DEFAULT '{}',
  -- Ordered within its stage / any-bucket.
  sort_order integer NOT NULL DEFAULT 0,
  -- Typed condition trees evaluated in TypeScript.
  activation_conditions jsonb NOT NULL DEFAULT '{"all":[]}'::jsonb,
  completion_conditions jsonb NOT NULL DEFAULT '{"all":[]}'::jsonb,
  -- Linked resources: [{ type: 'module'|'doc'|'build_guide'|'external', ref: string, label?: string }]
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX growth_roadmap_tasks_stage_idx ON public.growth_roadmap_tasks(stage) WHERE is_active;
CREATE INDEX growth_roadmap_tasks_sort_idx ON public.growth_roadmap_tasks(sort_order);

GRANT SELECT ON public.growth_roadmap_tasks TO authenticated;
GRANT ALL ON public.growth_roadmap_tasks TO service_role;

ALTER TABLE public.growth_roadmap_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active roadmap tasks"
  ON public.growth_roadmap_tasks
  FOR SELECT
  TO authenticated
  USING (is_active OR public.is_app_admin(auth.uid()));

CREATE POLICY "App admins can insert roadmap tasks"
  ON public.growth_roadmap_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "App admins can update roadmap tasks"
  ON public.growth_roadmap_tasks
  FOR UPDATE
  TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "App admins can delete roadmap tasks"
  ON public.growth_roadmap_tasks
  FOR DELETE
  TO authenticated
  USING (public.is_app_admin(auth.uid()));

CREATE TRIGGER growth_roadmap_tasks_touch
  BEFORE UPDATE ON public.growth_roadmap_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) Per-workspace progress
-- ============================================================
CREATE TABLE public.growth_task_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.growth_roadmap_tasks(id) ON DELETE CASCADE,
  status public.growth_task_status NOT NULL DEFAULT 'available',
  activated_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  snoozed_until timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sub_account_id, task_id)
);

CREATE INDEX growth_task_progress_sub_idx ON public.growth_task_progress(sub_account_id);
CREATE INDEX growth_task_progress_status_idx ON public.growth_task_progress(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_task_progress TO authenticated;
GRANT ALL ON public.growth_task_progress TO service_role;

ALTER TABLE public.growth_task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their workspace task progress"
  ON public.growth_task_progress
  FOR SELECT
  TO authenticated
  USING (
    public.is_sub_account_member(auth.uid(), sub_account_id)
    OR public.is_app_admin(auth.uid())
  );

CREATE POLICY "Members can insert their workspace task progress"
  ON public.growth_task_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can update their workspace task progress"
  ON public.growth_task_progress
  FOR UPDATE
  TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can delete their workspace task progress"
  ON public.growth_task_progress
  FOR DELETE
  TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE TRIGGER growth_task_progress_touch
  BEFORE UPDATE ON public.growth_task_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
