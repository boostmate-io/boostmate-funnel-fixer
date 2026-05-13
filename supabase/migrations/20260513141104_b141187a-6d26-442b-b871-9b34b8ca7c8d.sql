ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS template_type text;
ALTER TABLE public.seed_templates ADD COLUMN IF NOT EXISTS template_type text;