ALTER TABLE public.growth_systems_catalog
  ADD COLUMN IF NOT EXISTS ai_guidance text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.growth_systems_catalog c
SET ai_guidance = COALESCE(NULLIF(s.ai_guidance, ''), c.ai_guidance),
    translations = CASE WHEN s.translations IS NULL OR s.translations = '{}'::jsonb THEN c.translations ELSE s.translations END
FROM public.growth_systems s
WHERE s.id = c.key;

DROP TABLE IF EXISTS public.growth_systems CASCADE;