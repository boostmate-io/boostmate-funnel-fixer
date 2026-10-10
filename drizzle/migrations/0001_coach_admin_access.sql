DROP POLICY IF EXISTS "Members can create own coach conversations" ON public.ai_coach_conversations;
DROP POLICY IF EXISTS "Members can delete own coach conversations" ON public.ai_coach_conversations;
DROP POLICY IF EXISTS "Members can update own coach conversations" ON public.ai_coach_conversations;
DROP POLICY IF EXISTS "Members can view own coach conversations" ON public.ai_coach_conversations;
CREATE POLICY "Members can create own coach conversations" ON public.ai_coach_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid())));
CREATE POLICY "Members can view own coach conversations" ON public.ai_coach_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid())));
CREATE POLICY "Members can update own coach conversations" ON public.ai_coach_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid())))
  WITH CHECK (auth.uid() = user_id AND (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid())));
CREATE POLICY "Members can delete own coach conversations" ON public.ai_coach_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid())));

DROP POLICY IF EXISTS "Members can delete coach messages in own conversations" ON public.ai_coach_messages;
DROP POLICY IF EXISTS "Members can insert coach messages in own conversations" ON public.ai_coach_messages;
DROP POLICY IF EXISTS "Members can view coach messages in own conversations" ON public.ai_coach_messages;
CREATE POLICY "Members can view coach messages in own conversations" ON public.ai_coach_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_coach_conversations c WHERE c.id = ai_coach_messages.conversation_id AND c.user_id = auth.uid()
    AND (public.is_sub_account_member(auth.uid(), c.sub_account_id) OR public.is_app_admin(auth.uid()))));
CREATE POLICY "Members can insert coach messages in own conversations" ON public.ai_coach_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_coach_conversations c WHERE c.id = ai_coach_messages.conversation_id AND c.user_id = auth.uid()
    AND (public.is_sub_account_member(auth.uid(), c.sub_account_id) OR public.is_app_admin(auth.uid()))));
CREATE POLICY "Members can delete coach messages in own conversations" ON public.ai_coach_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_coach_conversations c WHERE c.id = ai_coach_messages.conversation_id AND c.user_id = auth.uid()
    AND (public.is_sub_account_member(auth.uid(), c.sub_account_id) OR public.is_app_admin(auth.uid()))));

DROP POLICY IF EXISTS "Members can manage coach memory" ON public.ai_coach_memory;
DROP POLICY IF EXISTS "Members can view coach memory" ON public.ai_coach_memory;
CREATE POLICY "Members can manage coach memory" ON public.ai_coach_memory FOR ALL TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()));