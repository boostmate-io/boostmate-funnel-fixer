
-- Setup types (configurable per workspace)
CREATE TABLE public.outreach_setup_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_setup_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage outreach setup types"
  ON public.outreach_setup_types FOR ALL TO authenticated
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

-- Lead sources (configurable per workspace)
CREATE TABLE public.outreach_lead_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage outreach lead sources"
  ON public.outreach_lead_sources FOR ALL TO authenticated
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

-- Outreach settings (per workspace)
CREATE TABLE public.outreach_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE UNIQUE,
  opener_template text NOT NULL DEFAULT '',
  follow_up_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  messaging_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_prompt_context text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage outreach settings"
  ON public.outreach_settings FOR ALL TO authenticated
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

-- Leads table
CREATE TYPE public.outreach_channel AS ENUM ('dm', 'email');
CREATE TYPE public.outreach_status AS ENUM ('new', 'drafted', 'ready_to_send', 'sent', 'replied', 'interested', 'closed', 'no_response');

CREATE TABLE public.outreach_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  niche text NOT NULL DEFAULT '',
  offer text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT '',
  profile_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  setup_type text NOT NULL DEFAULT '',
  main_problem text NOT NULL DEFAULT '',
  main_angle text NOT NULL DEFAULT '',
  lead_source text NOT NULL DEFAULT '',
  outreach_channel outreach_channel NOT NULL DEFAULT 'dm',
  status outreach_status NOT NULL DEFAULT 'new',
  last_contact_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage outreach leads"
  ON public.outreach_leads FOR ALL TO authenticated
  USING (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()));

-- Messages table
CREATE TYPE public.outreach_message_type AS ENUM ('opener', 'opener_alt', 'followup_1', 'followup_2', 'followup_3', 'followup_4');

CREATE TABLE public.outreach_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  message_type outreach_message_type NOT NULL,
  channel outreach_channel NOT NULL DEFAULT 'dm',
  content text NOT NULL DEFAULT '',
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage outreach messages"
  ON public.outreach_messages FOR ALL TO authenticated
  USING (
    lead_id IN (
      SELECT ol.id FROM public.outreach_leads ol
      WHERE is_sub_account_member(auth.uid(), ol.sub_account_id) OR is_app_admin(auth.uid())
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT ol.id FROM public.outreach_leads ol
      WHERE is_sub_account_member(auth.uid(), ol.sub_account_id) OR is_app_admin(auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_outreach_leads_sub_account ON public.outreach_leads(sub_account_id);
CREATE INDEX idx_outreach_leads_status ON public.outreach_leads(status);
CREATE INDEX idx_outreach_leads_next_followup ON public.outreach_leads(next_followup_at);
CREATE INDEX idx_outreach_messages_lead ON public.outreach_messages(lead_id);
CREATE INDEX idx_outreach_messages_sent ON public.outreach_messages(sent);

-- Updated_at triggers
CREATE TRIGGER update_outreach_setup_types_updated_at BEFORE UPDATE ON public.outreach_setup_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_lead_sources_updated_at BEFORE UPDATE ON public.outreach_lead_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_settings_updated_at BEFORE UPDATE ON public.outreach_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_leads_updated_at BEFORE UPDATE ON public.outreach_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outreach_messages_updated_at BEFORE UPDATE ON public.outreach_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
