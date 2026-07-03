ALTER TABLE public.copy_components ADD COLUMN IF NOT EXISTS output_structure jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.copy_components cc
SET output_structure = COALESCE(a.output_structure, '[]'::jsonb)
FROM public.ai_actions a
WHERE cc.ai_action_slug = a.slug
  AND (cc.output_structure IS NULL OR cc.output_structure = '[]'::jsonb)
  AND a.output_structure IS NOT NULL;