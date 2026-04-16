
-- AI Actions: centralized reusable AI logic
CREATE TABLE public.ai_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'generation',
  prompt_template text NOT NULL DEFAULT '',
  model_settings jsonb NOT NULL DEFAULT '{"model": "google/gemini-3-flash-preview", "temperature": 0.7}'::jsonb,
  input_structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage
CREATE POLICY "Admins can manage ai_actions"
  ON public.ai_actions FOR ALL TO authenticated
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));

-- All authenticated users can read (needed to execute actions)
CREATE POLICY "Authenticated users can read ai_actions"
  ON public.ai_actions FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_ai_actions_updated_at
  BEFORE UPDATE ON public.ai_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Instruction Blocks: reusable prompt modules
CREATE TABLE public.ai_instruction_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_instruction_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage instruction_blocks"
  ON public.ai_instruction_blocks FOR ALL TO authenticated
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));

CREATE POLICY "Authenticated users can read instruction_blocks"
  ON public.ai_instruction_blocks FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_ai_instruction_blocks_updated_at
  BEFORE UPDATE ON public.ai_instruction_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Junction table: link blocks to actions
CREATE TABLE public.ai_action_instruction_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_action_id uuid NOT NULL REFERENCES public.ai_actions(id) ON DELETE CASCADE,
  instruction_block_id uuid NOT NULL REFERENCES public.ai_instruction_blocks(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ai_action_id, instruction_block_id)
);

ALTER TABLE public.ai_action_instruction_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage action_instruction_blocks"
  ON public.ai_action_instruction_blocks FOR ALL TO authenticated
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));

CREATE POLICY "Authenticated users can read action_instruction_blocks"
  ON public.ai_action_instruction_blocks FOR SELECT TO authenticated
  USING (true);
