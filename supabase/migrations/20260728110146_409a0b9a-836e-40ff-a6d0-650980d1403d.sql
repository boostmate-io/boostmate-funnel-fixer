DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.ai_coach_proposal_decisions'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.ai_coach_proposal_decisions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.ai_coach_proposal_decisions_conv_path_key;

CREATE UNIQUE INDEX IF NOT EXISTS ai_coach_proposal_decisions_conv_msg_path_key
  ON public.ai_coach_proposal_decisions (conversation_id, message_id, path) NULLS NOT DISTINCT;