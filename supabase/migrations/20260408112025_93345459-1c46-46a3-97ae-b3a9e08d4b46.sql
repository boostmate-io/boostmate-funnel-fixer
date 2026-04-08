
-- =============================================
-- 1. NEW ENUMS
-- =============================================
CREATE TYPE public.main_account_type AS ENUM ('standard', 'agency');
CREATE TYPE public.membership_role AS ENUM ('owner', 'admin', 'member', 'workspace_admin', 'workspace_member');

-- =============================================
-- 2. NEW TABLES
-- =============================================

-- Main Accounts
CREATE TABLE public.main_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'My Account',
  type main_account_type NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.main_accounts ENABLE ROW LEVEL SECURITY;

-- Sub Accounts
CREATE TABLE public.sub_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  main_account_id uuid NOT NULL REFERENCES public.main_accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Workspace',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sub_accounts_main ON public.sub_accounts(main_account_id);

-- Account Memberships
CREATE TABLE public.account_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  main_account_id uuid NOT NULL REFERENCES public.main_accounts(id) ON DELETE CASCADE,
  sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sub_account_id)
);
ALTER TABLE public.account_memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_memberships_user ON public.account_memberships(user_id);
CREATE INDEX idx_memberships_sub ON public.account_memberships(sub_account_id);
CREATE INDEX idx_memberships_main ON public.account_memberships(main_account_id);

-- Account Invites
CREATE TABLE public.account_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  main_account_id uuid NOT NULL REFERENCES public.main_accounts(id) ON DELETE CASCADE,
  sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  email text NOT NULL,
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  role membership_role NOT NULL DEFAULT 'workspace_member',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_code)
);
ALTER TABLE public.account_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invites_code ON public.account_invites(invite_code);

-- =============================================
-- 3. ADD sub_account_id TO DATA TABLES
-- =============================================
ALTER TABLE public.funnels ADD COLUMN sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.assets ADD COLUMN sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.audits ADD COLUMN sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.funnel_analytics_entries ADD COLUMN sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.funnel_briefs ADD COLUMN sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_funnels_sub ON public.funnels(sub_account_id);
CREATE INDEX idx_offers_sub ON public.offers(sub_account_id);
CREATE INDEX idx_assets_sub ON public.assets(sub_account_id);
CREATE INDEX idx_audits_sub ON public.audits(sub_account_id);
CREATE INDEX idx_analytics_sub ON public.funnel_analytics_entries(sub_account_id);
CREATE INDEX idx_briefs_sub ON public.funnel_briefs(sub_account_id);

-- =============================================
-- 4. SECURITY DEFINER FUNCTIONS
-- =============================================

-- Get all sub_account_ids a user has access to
CREATE OR REPLACE FUNCTION public.get_user_sub_accounts(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT sub_account_id
  FROM public.account_memberships
  WHERE user_id = _user_id
    AND sub_account_id IS NOT NULL
$$;

-- Check if user is member of a specific sub-account
CREATE OR REPLACE FUNCTION public.is_sub_account_member(_user_id uuid, _sub_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_memberships
    WHERE user_id = _user_id AND sub_account_id = _sub_id
  )
$$;

-- Check if user is owner or admin of a main account
CREATE OR REPLACE FUNCTION public.is_main_account_admin(_user_id uuid, _main_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_memberships
    WHERE user_id = _user_id
      AND main_account_id = _main_id
      AND role IN ('owner', 'admin')
      AND sub_account_id IS NULL
  )
$$;

-- Check if user is app admin (uses existing user_roles table)
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Get main_account_id for a user (first/primary)
CREATE OR REPLACE FUNCTION public.get_user_main_account(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT main_account_id
  FROM public.account_memberships
  WHERE user_id = _user_id AND sub_account_id IS NULL AND role = 'owner'
  LIMIT 1
$$;

-- =============================================
-- 5. RLS POLICIES FOR NEW TABLES
-- =============================================

-- main_accounts: members can read, admins/owners can manage, app_admins can do all
CREATE POLICY "Members can read own main account" ON public.main_accounts
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT main_account_id FROM public.account_memberships WHERE user_id = auth.uid())
    OR is_app_admin(auth.uid())
  );

CREATE POLICY "Owners can update own main account" ON public.main_accounts
  FOR UPDATE TO authenticated
  USING (is_main_account_admin(auth.uid(), id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_main_account_admin(auth.uid(), id) OR is_app_admin(auth.uid()));

CREATE POLICY "System can insert main accounts" ON public.main_accounts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "App admins can delete main accounts" ON public.main_accounts
  FOR DELETE TO authenticated
  USING (is_app_admin(auth.uid()));

-- sub_accounts: members can read, main account admins can manage
CREATE POLICY "Members can read own sub accounts" ON public.sub_accounts
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR main_account_id IN (SELECT main_account_id FROM public.account_memberships WHERE user_id = auth.uid())
    OR is_app_admin(auth.uid())
  );

CREATE POLICY "Main account admins can manage sub accounts" ON public.sub_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid())
  );

CREATE POLICY "Main account admins can update sub accounts" ON public.sub_accounts
  FOR UPDATE TO authenticated
  USING (is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid()))
  WITH CHECK (is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid()));

CREATE POLICY "Main account admins can delete sub accounts" ON public.sub_accounts
  FOR DELETE TO authenticated
  USING (
    (is_main_account_admin(auth.uid(), main_account_id) AND is_default = false)
    OR is_app_admin(auth.uid())
  );

-- account_memberships: users can read own, main account admins can manage
CREATE POLICY "Users can read own memberships" ON public.account_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR main_account_id IN (
      SELECT main_account_id FROM public.account_memberships am2
      WHERE am2.user_id = auth.uid() AND am2.role IN ('owner', 'admin')
    )
    OR is_app_admin(auth.uid())
  );

CREATE POLICY "Main account admins can insert memberships" ON public.account_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY "Main account admins can update memberships" ON public.account_memberships
  FOR UPDATE TO authenticated
  USING (
    is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid())
  );

CREATE POLICY "Main account admins can delete memberships" ON public.account_memberships
  FOR DELETE TO authenticated
  USING (
    is_main_account_admin(auth.uid(), main_account_id) OR is_app_admin(auth.uid())
  );

-- account_invites
CREATE POLICY "Main account admins can manage invites" ON public.account_invites
  FOR ALL TO authenticated
  USING (is_main_account_admin(auth.uid(), main_account_id) OR invited_by = auth.uid() OR is_app_admin(auth.uid()))
  WITH CHECK (is_main_account_admin(auth.uid(), main_account_id) OR invited_by = auth.uid() OR is_app_admin(auth.uid()));

CREATE POLICY "Anyone can read invite by code" ON public.account_invites
  FOR SELECT TO anon, authenticated
  USING (status = 'pending');

-- =============================================
-- 6. UPDATE RLS ON DATA TABLES (add sub_account_id policies)
-- =============================================

-- Funnels: add sub-account policy
CREATE POLICY "Sub account members can manage funnels" ON public.funnels
  FOR ALL TO authenticated
  USING (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  );

-- Offers: add sub-account policy
CREATE POLICY "Sub account members can manage offers" ON public.offers
  FOR ALL TO authenticated
  USING (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  );

-- Assets: add sub-account policy
CREATE POLICY "Sub account members can manage assets" ON public.assets
  FOR ALL TO authenticated
  USING (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  );

-- Audits: add sub-account policy
CREATE POLICY "Sub account members can manage audits" ON public.audits
  FOR ALL TO authenticated
  USING (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  );

-- Analytics entries: add sub-account policy
CREATE POLICY "Sub account members can manage analytics" ON public.funnel_analytics_entries
  FOR ALL TO authenticated
  USING (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  );

-- Briefs: add sub-account policy
CREATE POLICY "Sub account members can manage briefs" ON public.funnel_briefs
  FOR ALL TO authenticated
  USING (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  )
  WITH CHECK (
    sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    OR is_app_admin(auth.uid())
  );

-- =============================================
-- 7. DATA MIGRATION: existing users → new structure
-- =============================================
DO $$
DECLARE
  r RECORD;
  new_main_id uuid;
  new_sub_id uuid;
  client_sub_id uuid;
BEGIN
  -- Migrate personal/agency users
  FOR r IN SELECT p.id, p.account_type FROM public.profiles p LOOP
    -- Create main account
    INSERT INTO public.main_accounts (id, name, type)
    VALUES (
      gen_random_uuid(),
      CASE WHEN r.account_type = 'agency' THEN 'Agency Account' ELSE 'My Account' END,
      CASE WHEN r.account_type = 'agency' THEN 'agency'::main_account_type ELSE 'standard'::main_account_type END
    )
    RETURNING id INTO new_main_id;

    -- Create default sub account
    INSERT INTO public.sub_accounts (id, main_account_id, name, is_default)
    VALUES (gen_random_uuid(), new_main_id, 'Default Workspace', true)
    RETURNING id INTO new_sub_id;

    -- Create owner membership (main account level)
    INSERT INTO public.account_memberships (user_id, main_account_id, sub_account_id, role)
    VALUES (r.id, new_main_id, NULL, 'owner');

    -- Create workspace_admin membership (sub account level)
    INSERT INTO public.account_memberships (user_id, main_account_id, sub_account_id, role)
    VALUES (r.id, new_main_id, new_sub_id, 'workspace_admin');

    -- Backfill sub_account_id on data tables for this user
    UPDATE public.funnels SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL AND is_template = false;
    UPDATE public.funnels SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL AND is_template = true;
    UPDATE public.offers SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL;
    UPDATE public.assets SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL;
    UPDATE public.audits SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL;
    UPDATE public.funnel_analytics_entries SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL;
    UPDATE public.funnel_briefs SET sub_account_id = new_sub_id WHERE user_id = r.id AND sub_account_id IS NULL;

    -- For agency users: migrate their client_accounts as sub_accounts
    IF r.account_type = 'agency' THEN
      FOR client_sub_id IN
        SELECT ca.id FROM public.client_accounts ca WHERE ca.agency_user_id = r.id
      LOOP
        INSERT INTO public.sub_accounts (id, main_account_id, name, is_default)
        SELECT client_sub_id, new_main_id, ca.name, false
        FROM public.client_accounts ca WHERE ca.id = client_sub_id;
      END LOOP;

      -- Migrate agency_clients as memberships
      INSERT INTO public.account_memberships (user_id, main_account_id, sub_account_id, role)
      SELECT ac.client_user_id, new_main_id, ac.client_account_id, 'workspace_member'::membership_role
      FROM public.agency_clients ac
      WHERE ac.agency_user_id = r.id
        AND ac.client_user_id != r.id
        AND ac.client_account_id IS NOT NULL
      ON CONFLICT (user_id, sub_account_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =============================================
-- 8. UPDATE SIGNUP TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_main_id uuid;
  new_sub_id uuid;
  tmpl RECORD;
  new_funnel_id uuid;
  acct_type text;
BEGIN
  -- Assign user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Determine account type from metadata (default: standard)
  acct_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'standard');

  -- Create main account
  INSERT INTO public.main_accounts (name, type)
  VALUES (
    CASE WHEN acct_type = 'agency' THEN 'Agency Account' ELSE 'My Account' END,
    CASE WHEN acct_type = 'agency' THEN 'agency'::main_account_type ELSE 'standard'::main_account_type END
  )
  RETURNING id INTO new_main_id;

  -- Create default sub account
  INSERT INTO public.sub_accounts (main_account_id, name, is_default)
  VALUES (new_main_id, 'Default Workspace', true)
  RETURNING id INTO new_sub_id;

  -- Create owner membership (main account level)
  INSERT INTO public.account_memberships (user_id, main_account_id, role)
  VALUES (NEW.id, new_main_id, 'owner');

  -- Create workspace_admin membership (sub account level)
  INSERT INTO public.account_memberships (user_id, main_account_id, sub_account_id, role)
  VALUES (NEW.id, new_main_id, new_sub_id, 'workspace_admin');

  -- Clone active seed templates into the default sub account
  FOR tmpl IN
    SELECT st.name, st.description, st.nodes, st.edges, st.brief_structure
    FROM public.seed_templates st
    WHERE st.is_active = true
  LOOP
    INSERT INTO public.funnels (user_id, sub_account_id, name, description, nodes, edges, is_template)
    VALUES (NEW.id, new_sub_id, tmpl.name, tmpl.description, tmpl.nodes, tmpl.edges, true)
    RETURNING id INTO new_funnel_id;

    IF tmpl.brief_structure IS NOT NULL
       AND tmpl.brief_structure != '{"sections":[]}'::jsonb
       AND jsonb_array_length(tmpl.brief_structure -> 'sections') > 0
    THEN
      INSERT INTO public.funnel_briefs (funnel_id, user_id, sub_account_id, structure, "values")
      VALUES (new_funnel_id, NEW.id, new_sub_id, tmpl.brief_structure, '{}'::jsonb);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_main_accounts_updated_at
  BEFORE UPDATE ON public.main_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_accounts_updated_at
  BEFORE UPDATE ON public.sub_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
