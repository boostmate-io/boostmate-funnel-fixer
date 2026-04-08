
-- Allow app admins to read all profiles
CREATE POLICY "App admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_app_admin(auth.uid()));

-- Function to get user emails (only for admins)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(id uuid, email text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT au.id, au.email::text, au.created_at
  FROM auth.users au
  WHERE is_app_admin(auth.uid())
  ORDER BY au.created_at DESC
$$;
