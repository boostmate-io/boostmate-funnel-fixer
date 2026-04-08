-- Fix infinite recursion in account_memberships SELECT policy
-- The current policy references account_memberships inside itself

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can read own memberships" ON public.account_memberships;

-- Create a security definer function to check main account admin without querying account_memberships directly
CREATE OR REPLACE FUNCTION public.get_user_main_accounts(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT main_account_id
  FROM public.account_memberships
  WHERE user_id = _user_id
    AND role IN ('owner', 'admin')
    AND sub_account_id IS NULL
$$;

-- Recreate SELECT policy using the security definer function
CREATE POLICY "Users can read own memberships"
ON public.account_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR main_account_id IN (SELECT get_user_main_accounts(auth.uid()))
  OR is_app_admin(auth.uid())
);