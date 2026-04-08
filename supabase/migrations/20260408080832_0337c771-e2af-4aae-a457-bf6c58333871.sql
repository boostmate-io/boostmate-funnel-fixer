ALTER TABLE public.funnel_briefs
ADD COLUMN approved_fields jsonb NOT NULL DEFAULT '{}'::jsonb;