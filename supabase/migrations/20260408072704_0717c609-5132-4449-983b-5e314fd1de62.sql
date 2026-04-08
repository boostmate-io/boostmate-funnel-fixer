-- Create funnel_briefs table
CREATE TABLE public.funnel_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_token TEXT DEFAULT NULL,
  share_permission TEXT NOT NULL DEFAULT 'view',
  structure JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  "values" JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id)
);

-- Enable RLS
ALTER TABLE public.funnel_briefs ENABLE ROW LEVEL SECURITY;

-- Owner policy
CREATE POLICY "Users can manage own funnel briefs"
  ON public.funnel_briefs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Agency policy
CREATE POLICY "Agency can manage client funnel briefs"
  ON public.funnel_briefs FOR ALL
  TO authenticated
  USING (is_agency_of(auth.uid(), user_id))
  WITH CHECK (is_agency_of(auth.uid(), user_id));

-- Public read via share token
CREATE POLICY "Anyone can read shared briefs by token"
  ON public.funnel_briefs FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL AND share_token <> '');

-- Public update values via share token with edit permission
CREATE POLICY "Anyone can update shared brief values if edit allowed"
  ON public.funnel_briefs FOR UPDATE
  TO anon, authenticated
  USING (share_token IS NOT NULL AND share_token <> '' AND share_permission = 'edit')
  WITH CHECK (share_token IS NOT NULL AND share_token <> '' AND share_permission = 'edit');

-- Updated_at trigger
CREATE TRIGGER update_funnel_briefs_updated_at
  BEFORE UPDATE ON public.funnel_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_funnel_updated_at();

-- Add brief_structure to seed_templates for template cloning
ALTER TABLE public.seed_templates
  ADD COLUMN brief_structure JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb;

-- Index for share token lookups
CREATE INDEX idx_funnel_briefs_share_token ON public.funnel_briefs(share_token) WHERE share_token IS NOT NULL;