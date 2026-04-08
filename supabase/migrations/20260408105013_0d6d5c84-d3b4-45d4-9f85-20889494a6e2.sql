
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.client_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Account',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can manage own client accounts"
ON public.client_accounts FOR ALL TO authenticated
USING (agency_user_id = auth.uid())
WITH CHECK (agency_user_id = auth.uid());

ALTER TABLE public.agency_clients
ADD COLUMN IF NOT EXISTS client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE CASCADE;

CREATE TABLE public.client_account_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  agency_user_id uuid NOT NULL,
  email text NOT NULL,
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_account_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can manage own account invites"
ON public.client_account_invites FOR ALL TO authenticated
USING (agency_user_id = auth.uid())
WITH CHECK (agency_user_id = auth.uid());

CREATE POLICY "Anyone can read account invite by code"
ON public.client_account_invites FOR SELECT TO anon, authenticated
USING (status = 'pending');

CREATE TRIGGER update_client_accounts_updated_at
BEFORE UPDATE ON public.client_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
