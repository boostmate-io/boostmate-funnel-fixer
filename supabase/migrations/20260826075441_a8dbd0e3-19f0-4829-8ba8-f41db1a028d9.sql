CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  subaccount_action text NOT NULL DEFAULT 'delete_all',
  purge_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX account_deletion_requests_user_pending ON public.account_deletion_requests (user_id);

GRANT SELECT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion request"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (public.is_app_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.deletion_purge_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
BEGIN
  PERFORM net.http_post(
    url := 'https://exqexdgdkvfhmipblnco.supabase.co/functions/v1/delete-account',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{"action":"purge"}'::jsonb
  );
END;
$fn$;

SELECT cron.schedule('purge-deleted-accounts', '17 3 * * *', $cron$ SELECT public.deletion_purge_dispatch(); $cron$);