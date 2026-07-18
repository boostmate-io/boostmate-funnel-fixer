
-- ============================================================
-- 1. growth_stage_cycles
-- ============================================================
CREATE TABLE public.growth_stage_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  stage text NOT NULL,
  cycle_number integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  started_by_reason text NOT NULL DEFAULT 'stage_entry',
  ended_by_reason text,
  ended_by_assessment_id uuid REFERENCES public.growth_assessments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX growth_stage_cycles_active_uniq
  ON public.growth_stage_cycles (sub_account_id, stage)
  WHERE ended_at IS NULL;

CREATE UNIQUE INDEX growth_stage_cycles_number_uniq
  ON public.growth_stage_cycles (sub_account_id, stage, cycle_number);

CREATE INDEX growth_stage_cycles_sub_account_idx
  ON public.growth_stage_cycles (sub_account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_stage_cycles TO authenticated;
GRANT ALL ON public.growth_stage_cycles TO service_role;

ALTER TABLE public.growth_stage_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their workspace cycles"
  ON public.growth_stage_cycles FOR SELECT
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Members can insert their workspace cycles"
  ON public.growth_stage_cycles FOR INSERT
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Members can update their workspace cycles"
  ON public.growth_stage_cycles FOR UPDATE
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Members can delete their workspace cycles"
  ON public.growth_stage_cycles FOR DELETE
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Agencies can manage client workspace cycles"
  ON public.growth_stage_cycles FOR ALL
  USING (
    sub_account_id IN (
      SELECT sa.id FROM sub_accounts sa
      JOIN account_memberships am ON am.main_account_id = sa.main_account_id
      WHERE is_agency_of(auth.uid(), am.user_id)
    )
  )
  WITH CHECK (
    sub_account_id IN (
      SELECT sa.id FROM sub_accounts sa
      JOIN account_memberships am ON am.main_account_id = sa.main_account_id
      WHERE is_agency_of(auth.uid(), am.user_id)
    )
  );

CREATE TRIGGER growth_stage_cycles_set_updated_at
  BEFORE UPDATE ON public.growth_stage_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. growth_workspace_state
-- ============================================================
CREATE TABLE public.growth_workspace_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL UNIQUE REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_workspace_state TO authenticated;
GRANT ALL ON public.growth_workspace_state TO service_role;

ALTER TABLE public.growth_workspace_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their workspace state"
  ON public.growth_workspace_state FOR SELECT
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Members can insert their workspace state"
  ON public.growth_workspace_state FOR INSERT
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Members can update their workspace state"
  ON public.growth_workspace_state FOR UPDATE
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Members can delete their workspace state"
  ON public.growth_workspace_state FOR DELETE
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Agencies can manage client workspace state"
  ON public.growth_workspace_state FOR ALL
  USING (
    sub_account_id IN (
      SELECT sa.id FROM sub_accounts sa
      JOIN account_memberships am ON am.main_account_id = sa.main_account_id
      WHERE is_agency_of(auth.uid(), am.user_id)
    )
  )
  WITH CHECK (
    sub_account_id IN (
      SELECT sa.id FROM sub_accounts sa
      JOIN account_memberships am ON am.main_account_id = sa.main_account_id
      WHERE is_agency_of(auth.uid(), am.user_id)
    )
  );

CREATE TRIGGER growth_workspace_state_set_updated_at
  BEFORE UPDATE ON public.growth_workspace_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. growth_task_progress: cycle_id column + reindex
-- ============================================================
ALTER TABLE public.growth_task_progress
  ADD COLUMN cycle_id uuid REFERENCES public.growth_stage_cycles(id) ON DELETE CASCADE;

CREATE INDEX growth_task_progress_cycle_idx
  ON public.growth_task_progress (cycle_id);

-- Drop the old workspace-permanent uniqueness
ALTER TABLE public.growth_task_progress
  DROP CONSTRAINT growth_task_progress_sub_account_id_task_id_key;

-- Cycle-scoped tasks: unique per (workspace, task, cycle)
CREATE UNIQUE INDEX growth_task_progress_cycle_task_uniq
  ON public.growth_task_progress (sub_account_id, task_id, cycle_id)
  WHERE cycle_id IS NOT NULL;

-- Foundation (cycle-less) tasks: unique per (workspace, task)
CREATE UNIQUE INDEX growth_task_progress_foundation_task_uniq
  ON public.growth_task_progress (sub_account_id, task_id)
  WHERE cycle_id IS NULL;

-- ============================================================
-- 4. Backfill
-- ============================================================
-- Open a starting cycle for every workspace that has an active assessment.
INSERT INTO public.growth_stage_cycles (sub_account_id, stage, cycle_number, started_by_reason, started_at)
SELECT DISTINCT ga.sub_account_id, ga.computed_stage, 1, 'backfill_initial', COALESCE(ga.created_at, now())
FROM public.growth_assessments ga
WHERE ga.is_active = true
  AND ga.sub_account_id IS NOT NULL;

-- Attach existing stage-scoped task progress to the active cycle for that stage.
-- Foundation tasks (stage = 'any') stay cycle-less.
UPDATE public.growth_task_progress gtp
SET cycle_id = c.id
FROM public.growth_roadmap_tasks t
JOIN public.growth_stage_cycles c
  ON c.stage = t.stage AND c.ended_at IS NULL
WHERE gtp.task_id = t.id
  AND gtp.sub_account_id = c.sub_account_id
  AND t.stage <> 'any'
  AND gtp.cycle_id IS NULL;
