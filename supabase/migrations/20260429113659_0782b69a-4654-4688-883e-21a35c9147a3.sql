
ALTER TABLE public.business_blueprints
  ADD COLUMN IF NOT EXISTS share_token text;

CREATE UNIQUE INDEX IF NOT EXISTS business_blueprints_share_token_key
  ON public.business_blueprints (share_token)
  WHERE share_token IS NOT NULL;

-- Allow anonymous read of blueprints by share token (for public view mode)
DROP POLICY IF EXISTS "Anyone can read shared blueprints by token" ON public.business_blueprints;
CREATE POLICY "Anyone can read shared blueprints by token"
  ON public.business_blueprints
  FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL AND share_token <> '');

-- Allow anonymous read of growth_funnel_mappings via shared blueprint
DROP POLICY IF EXISTS "Anyone can read mappings via shared blueprint" ON public.growth_funnel_mappings;
CREATE POLICY "Anyone can read mappings via shared blueprint"
  ON public.growth_funnel_mappings
  FOR SELECT
  TO anon, authenticated
  USING (
    blueprint_id IN (
      SELECT id FROM public.business_blueprints
      WHERE share_token IS NOT NULL AND share_token <> ''
    )
  );

-- Allow anonymous read of offers via shared blueprint
DROP POLICY IF EXISTS "Anyone can read offers via shared blueprint" ON public.offers;
CREATE POLICY "Anyone can read offers via shared blueprint"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (
    blueprint_id IN (
      SELECT id FROM public.business_blueprints
      WHERE share_token IS NOT NULL AND share_token <> ''
    )
  );

-- Allow anonymous read of workspace_settings via shared blueprint (for currency / business type)
DROP POLICY IF EXISTS "Anyone can read settings via shared blueprint" ON public.workspace_settings;
CREATE POLICY "Anyone can read settings via shared blueprint"
  ON public.workspace_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    sub_account_id IN (
      SELECT sub_account_id FROM public.business_blueprints
      WHERE share_token IS NOT NULL AND share_token <> ''
    )
  );
