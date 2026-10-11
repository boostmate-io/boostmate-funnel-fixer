ALTER TABLE public.offer_builder_sessions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS result_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

CREATE TABLE public.offer_builder_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.offer_builder_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (char_length(content) <= 8000),
  stage text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX offer_builder_messages_session_idx ON public.offer_builder_messages(session_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.offer_builder_messages TO authenticated;
ALTER TABLE public.offer_builder_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builder messages: owner reads" ON public.offer_builder_messages FOR SELECT TO authenticated
USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.offer_builder_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()
  AND (public.is_sub_account_member(auth.uid(), s.sub_account_id) OR public.is_app_admin(auth.uid()))));
CREATE POLICY "Builder messages: owner inserts" ON public.offer_builder_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.offer_builder_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()
  AND (public.is_sub_account_member(auth.uid(), s.sub_account_id) OR public.is_app_admin(auth.uid()))));
CREATE POLICY "Builder messages: owner deletes" ON public.offer_builder_messages FOR DELETE TO authenticated
USING (user_id = auth.uid());