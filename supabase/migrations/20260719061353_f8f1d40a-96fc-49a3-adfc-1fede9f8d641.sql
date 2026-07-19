ALTER TABLE public.growth_roadmap_tasks
ADD COLUMN IF NOT EXISTS applicability_conditions jsonb NOT NULL DEFAULT '{"all": []}'::jsonb;