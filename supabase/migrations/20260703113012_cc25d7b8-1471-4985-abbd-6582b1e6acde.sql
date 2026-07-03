
-- Conversations
CREATE TABLE public.ai_coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  scope text NOT NULL,
  target_id text,
  target_label text,
  title text,
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ai_coach_conv_unique
  ON public.ai_coach_conversations (user_id, sub_account_id, scope, COALESCE(target_id, ''));

CREATE INDEX ai_coach_conv_sub_idx ON public.ai_coach_conversations (sub_account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_coach_conversations TO authenticated;
GRANT ALL ON public.ai_coach_conversations TO service_role;

ALTER TABLE public.ai_coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own coach conversations"
  ON public.ai_coach_conversations FOR SELECT
  USING (auth.uid() = user_id AND public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can create own coach conversations"
  ON public.ai_coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can update own coach conversations"
  ON public.ai_coach_conversations FOR UPDATE
  USING (auth.uid() = user_id AND public.is_sub_account_member(auth.uid(), sub_account_id))
  WITH CHECK (auth.uid() = user_id AND public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can delete own coach conversations"
  ON public.ai_coach_conversations FOR DELETE
  USING (auth.uid() = user_id AND public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE TRIGGER trg_ai_coach_conv_updated
  BEFORE UPDATE ON public.ai_coach_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages
CREATE TABLE public.ai_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_coach_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_coach_msg_conv_idx ON public.ai_coach_messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_coach_messages TO authenticated;
GRANT ALL ON public.ai_coach_messages TO service_role;

ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view coach messages in own conversations"
  ON public.ai_coach_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_coach_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
      AND public.is_sub_account_member(auth.uid(), c.sub_account_id)
  ));

CREATE POLICY "Members can insert coach messages in own conversations"
  ON public.ai_coach_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_coach_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
      AND public.is_sub_account_member(auth.uid(), c.sub_account_id)
  ));

CREATE POLICY "Members can delete coach messages in own conversations"
  ON public.ai_coach_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_coach_conversations c
    WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
      AND public.is_sub_account_member(auth.uid(), c.sub_account_id)
  ));

-- Memory (reserved for future use)
CREATE TABLE public.ai_coach_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  source_conversation_id uuid REFERENCES public.ai_coach_conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_coach_memory_sub_idx ON public.ai_coach_memory (sub_account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_coach_memory TO authenticated;
GRANT ALL ON public.ai_coach_memory TO service_role;

ALTER TABLE public.ai_coach_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view coach memory"
  ON public.ai_coach_memory FOR SELECT
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can manage coach memory"
  ON public.ai_coach_memory FOR ALL
  USING (public.is_sub_account_member(auth.uid(), sub_account_id))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE TRIGGER trg_ai_coach_memory_updated
  BEFORE UPDATE ON public.ai_coach_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
