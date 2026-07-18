
ALTER TABLE public.growth_roadmap_tasks
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS build_guide_ref text,
  ADD COLUMN IF NOT EXISTS coach_prompt_ref text;
