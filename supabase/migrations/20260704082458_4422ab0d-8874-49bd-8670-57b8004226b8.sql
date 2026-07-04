
CREATE TABLE public.ai_coach_proposal_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.ai_coach_conversations(id) ON DELETE CASCADE,
  message_id uuid NULL,
  sub_account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  path text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('applied','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, path)
);

CREATE INDEX ai_coach_proposal_decisions_conv_idx
  ON public.ai_coach_proposal_decisions (conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_coach_proposal_decisions TO authenticated;
GRANT ALL ON public.ai_coach_proposal_decisions TO service_role;

ALTER TABLE public.ai_coach_proposal_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own coach proposal decisions"
  ON public.ai_coach_proposal_decisions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
