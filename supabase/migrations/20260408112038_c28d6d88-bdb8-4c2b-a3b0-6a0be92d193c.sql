
-- Drop the overly permissive INSERT policy
DROP POLICY "System can insert main accounts" ON public.main_accounts;

-- Replace with a restrictive policy: only app admins can insert via client
-- The signup trigger runs as SECURITY DEFINER so it bypasses RLS
CREATE POLICY "App admins can insert main accounts" ON public.main_accounts
  FOR INSERT TO authenticated
  WITH CHECK (is_app_admin(auth.uid()));
