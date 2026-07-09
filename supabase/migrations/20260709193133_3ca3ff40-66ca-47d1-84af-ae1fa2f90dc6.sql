
INSERT INTO public.ai_actions (name, slug, description, type, prompt_template, model_settings, input_structure, output_structure, is_active)
VALUES (
  'Generate Generic Copy',
  'generate_generic_copy',
  'Free-form copy generator: takes a user prompt and returns rich-text content.',
  'copy',
  'You are an expert copywriter.

Business / offer context:
{{context}}

Component-specific AI generation rules:
{{component_instructions}}

User prompt and inputs:
{{inputs}}

Your task:
Write the copy the user asked for based on their prompt. Follow their instructions literally.
Return the result as the `content` field. Use plain text with newlines for paragraph breaks; you may use lightweight markdown (bold, lists, headings) if it improves readability.',
  '{"model":"google/gemini-2.5-flash","temperature":0.7}'::jsonb,
  '[
    {"key":"prompt","label":"Prompt","type":"long_text","placeholder":"Describe what you want written. Be specific about audience, tone, length, format."}
  ]'::jsonb,
  '[
    {"key":"content","label":"Content","type":"richtext","is_primary":true}
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    prompt_template = EXCLUDED.prompt_template,
    model_settings = EXCLUDED.model_settings,
    input_structure = EXCLUDED.input_structure,
    output_structure = EXCLUDED.output_structure,
    is_active = true;

INSERT INTO public.copy_components (name, slug, description, ai_action_slug, instructions, ui_interface_slug, config, is_active, sort_order, icon, output_structure, required_blueprint_fields)
VALUES (
  'Generic Copy',
  'generic_copy',
  'Free-form copy block. Give a prompt, get written content.',
  'generate_generic_copy',
  '',
  'generic',
  '{}'::jsonb,
  true,
  0,
  'FileText',
  '[
    {"key":"content","label":"Content","type":"richtext","is_primary":true}
  ]'::jsonb,
  ARRAY[]::text[]
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    ai_action_slug = EXCLUDED.ai_action_slug,
    ui_interface_slug = EXCLUDED.ui_interface_slug,
    icon = EXCLUDED.icon,
    output_structure = EXCLUDED.output_structure,
    is_active = true;

INSERT INTO public.copy_frameworks (name, description, component_slugs, type, is_active)
VALUES (
  'Generic Copy',
  'A minimal framework with a single free-form copy block. Use it for any document type when no dedicated framework exists.',
  '["generic_copy"]'::jsonb,
  'generic',
  true
)
ON CONFLICT DO NOTHING;
