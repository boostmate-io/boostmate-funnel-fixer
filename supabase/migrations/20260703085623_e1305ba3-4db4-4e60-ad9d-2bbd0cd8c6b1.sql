ALTER TABLE public.copy_components
  ADD COLUMN IF NOT EXISTS required_blueprint_fields text[] NOT NULL DEFAULT '{}';