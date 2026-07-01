DROP POLICY IF EXISTS "Sub account members can manage outreach leads" ON public.outreach_leads;

CREATE POLICY "Sub account members can manage outreach leads"
ON public.outreach_leads
FOR ALL
USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));