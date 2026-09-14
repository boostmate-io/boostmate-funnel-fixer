CREATE TABLE public.redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  destination_url text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.redirects TO authenticated;
GRANT ALL ON public.redirects TO service_role;

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage redirects"
ON public.redirects FOR ALL TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER redirects_set_updated_at
BEFORE UPDATE ON public.redirects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_redirect(_slug text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT destination_url FROM public.redirects WHERE slug = _slug LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.resolve_redirect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_redirect(text) TO anon, authenticated, service_role;
