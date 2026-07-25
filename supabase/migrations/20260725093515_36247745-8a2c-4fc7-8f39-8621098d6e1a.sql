ALTER TABLE public.growth_architecture_systems
ADD COLUMN IF NOT EXISTS pending_upstream_funnel_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];