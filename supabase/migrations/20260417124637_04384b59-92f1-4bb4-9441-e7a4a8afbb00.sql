-- Create workspace_settings table
CREATE TABLE public.workspace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id UUID NOT NULL UNIQUE REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL DEFAULT 'coach',
  help_achieve TEXT NOT NULL DEFAULT '',
  who_help TEXT NOT NULL DEFAULT '',
  main_goal TEXT NOT NULL DEFAULT '',
  biggest_challenge TEXT NOT NULL DEFAULT '',
  setup_status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | skipped
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Members of the sub-account can manage their workspace settings
CREATE POLICY "Sub account members can manage workspace settings"
ON public.workspace_settings
FOR ALL
TO authenticated
USING (
  is_sub_account_member(auth.uid(), sub_account_id)
  OR is_app_admin(auth.uid())
)
WITH CHECK (
  is_sub_account_member(auth.uid(), sub_account_id)
  OR is_app_admin(auth.uid())
);

-- Agencies can manage their client workspace settings
CREATE POLICY "Agencies can manage client workspace settings"
ON public.workspace_settings
FOR ALL
TO authenticated
USING (
  sub_account_id IN (
    SELECT sa.id FROM public.sub_accounts sa
    JOIN public.account_memberships am ON am.main_account_id = sa.main_account_id
    WHERE is_agency_of(auth.uid(), am.user_id)
  )
)
WITH CHECK (
  sub_account_id IN (
    SELECT sa.id FROM public.sub_accounts sa
    JOIN public.account_memberships am ON am.main_account_id = sa.main_account_id
    WHERE is_agency_of(auth.uid(), am.user_id)
  )
);

-- Auto-update updated_at
CREATE TRIGGER update_workspace_settings_updated_at
BEFORE UPDATE ON public.workspace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workspace_settings_sub_account ON public.workspace_settings(sub_account_id);