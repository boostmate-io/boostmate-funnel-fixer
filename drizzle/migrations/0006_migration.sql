ALTER TABLE public.public_offer_generations
  ADD COLUMN IF NOT EXISTS diagnosis jsonb,
  ADD COLUMN IF NOT EXISTS strengthen jsonb,
  ADD COLUMN IF NOT EXISTS choices jsonb,
  ADD COLUMN IF NOT EXISTS strengthen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS finalize_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.public_offer_generations DROP CONSTRAINT IF EXISTS public_offer_generations_status_check;
ALTER TABLE public.public_offer_generations ADD CONSTRAINT public_offer_generations_status_check
  CHECK (status = ANY (ARRAY['pending','diagnosed','complete','failed']));

CREATE TABLE public.video_audit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.public_offer_generations(id) ON DELETE SET NULL,
  email text NOT NULL,
  instagram text NOT NULL,
  acquisition_channel text NOT NULL CHECK (acquisition_channel IN ('instagram_organic','paid_ads','referrals','combination','no_system','other')),
  website text,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_text_version text,
  offer_snapshot jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','audit_sent','closed')),
  admin_notes text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX video_audit_requests_generation_email_key ON public.video_audit_requests (generation_id, email) WHERE generation_id IS NOT NULL;
CREATE INDEX video_audit_requests_created_idx ON public.video_audit_requests (created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.video_audit_requests TO authenticated;
GRANT ALL ON public.video_audit_requests TO service_role;
ALTER TABLE public.video_audit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit requests" ON public.video_audit_requests FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins update audit requests" ON public.video_audit_requests FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete audit requests" ON public.video_audit_requests FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE TRIGGER video_audit_requests_updated_at BEFORE UPDATE ON public.video_audit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();