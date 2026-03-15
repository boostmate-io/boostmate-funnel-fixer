
-- Assets table for storing all content types
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'sales_copy' CHECK (type IN ('sales_copy', 'email_sequence', 'ad_creative', 'social_media')),
  name TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Asset sections (reorderable sections within an asset)
CREATE TABLE public.asset_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Section',
  content TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for assets
CREATE POLICY "Users can manage own assets" ON public.assets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RLS policies for asset_sections (via asset ownership)
CREATE POLICY "Users can manage own asset sections" ON public.asset_sections FOR ALL TO authenticated
  USING (asset_id IN (SELECT id FROM public.assets WHERE user_id = auth.uid()))
  WITH CHECK (asset_id IN (SELECT id FROM public.assets WHERE user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_funnel_updated_at();

CREATE TRIGGER update_asset_sections_updated_at BEFORE UPDATE ON public.asset_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_funnel_updated_at();

-- Index for performance
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_asset_sections_asset_id ON public.asset_sections(asset_id);
CREATE INDEX idx_asset_sections_sort_order ON public.asset_sections(asset_id, sort_order);
