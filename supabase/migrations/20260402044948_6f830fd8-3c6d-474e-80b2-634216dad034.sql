
-- 1. Create account_type enum
CREATE TYPE public.account_type AS ENUM ('personal', 'agency', 'client');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL DEFAULT 'personal',
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users manage own
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Update trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_funnel_updated_at();

-- 3. Create agency_clients table
CREATE TABLE public.agency_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_user_id, client_user_id)
);
ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can manage own clients" ON public.agency_clients
  FOR ALL TO authenticated
  USING (agency_user_id = auth.uid())
  WITH CHECK (agency_user_id = auth.uid());

CREATE POLICY "Clients can read own agency link" ON public.agency_clients
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

-- 4. Create agency_invites table
CREATE TABLE public.agency_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can manage own invites" ON public.agency_invites
  FOR ALL TO authenticated
  USING (agency_user_id = auth.uid())
  WITH CHECK (agency_user_id = auth.uid());

-- Allow public lookup of invite codes (for registration flow)
CREATE POLICY "Anyone can read invite by code" ON public.agency_invites
  FOR SELECT TO anon, authenticated
  USING (status = 'pending');

-- 5. Security definer function: is_agency_of
CREATE OR REPLACE FUNCTION public.is_agency_of(_agency_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_clients
    WHERE agency_user_id = _agency_id
      AND client_user_id = _client_id
      AND status = 'active'
  )
$$;

-- 6. Agencies can read their clients' profiles
CREATE POLICY "Agencies can read client profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_agency_of(auth.uid(), id));

-- 7. Update RLS on existing tables to allow agency access

-- Projects: agency can access client projects
CREATE POLICY "Agency can manage client projects" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_agency_of(auth.uid(), user_id))
  WITH CHECK (public.is_agency_of(auth.uid(), user_id));

-- Funnels: agency can access client funnels
CREATE POLICY "Agency can manage client funnels" ON public.funnels
  FOR ALL TO authenticated
  USING (public.is_agency_of(auth.uid(), user_id))
  WITH CHECK (public.is_agency_of(auth.uid(), user_id));

-- Assets: agency can access client assets
CREATE POLICY "Agency can manage client assets" ON public.assets
  FOR ALL TO authenticated
  USING (public.is_agency_of(auth.uid(), user_id))
  WITH CHECK (public.is_agency_of(auth.uid(), user_id));

-- Audits: agency can access client audits
CREATE POLICY "Agency can manage client audits" ON public.audits
  FOR ALL TO authenticated
  USING (public.is_agency_of(auth.uid(), user_id))
  WITH CHECK (public.is_agency_of(auth.uid(), user_id));

-- Funnel analytics entries: agency can access client entries
CREATE POLICY "Agency can manage client analytics" ON public.funnel_analytics_entries
  FOR ALL TO authenticated
  USING (public.is_agency_of(auth.uid(), user_id))
  WITH CHECK (public.is_agency_of(auth.uid(), user_id));

-- Funnel step metrics: agency can access via client entries
CREATE POLICY "Agency can manage client step metrics" ON public.funnel_step_metrics
  FOR ALL TO authenticated
  USING (entry_id IN (
    SELECT id FROM public.funnel_analytics_entries
    WHERE public.is_agency_of(auth.uid(), user_id)
  ))
  WITH CHECK (entry_id IN (
    SELECT id FROM public.funnel_analytics_entries
    WHERE public.is_agency_of(auth.uid(), user_id)
  ));

-- Asset sections: agency can access via client assets
CREATE POLICY "Agency can manage client asset sections" ON public.asset_sections
  FOR ALL TO authenticated
  USING (asset_id IN (
    SELECT id FROM public.assets
    WHERE public.is_agency_of(auth.uid(), user_id)
  ))
  WITH CHECK (asset_id IN (
    SELECT id FROM public.assets
    WHERE public.is_agency_of(auth.uid(), user_id)
  ));
