
-- =========================================================================
-- Step 1a: acquisition_channel_categories
-- =========================================================================
CREATE TABLE public.acquisition_channel_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_channel_categories TO authenticated;
GRANT ALL ON public.acquisition_channel_categories TO service_role;

ALTER TABLE public.acquisition_channel_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active categories"
  ON public.acquisition_channel_categories FOR SELECT
  TO authenticated
  USING (is_active OR public.is_app_admin(auth.uid()));

CREATE POLICY "Admins manage categories"
  ON public.acquisition_channel_categories FOR ALL
  TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER acq_categories_updated_at
  BEFORE UPDATE ON public.acquisition_channel_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- Step 1b: acquisition_channels alterations
-- =========================================================================
ALTER TABLE public.acquisition_channels
  DROP COLUMN IF EXISTS category;

ALTER TABLE public.acquisition_channels
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.acquisition_channel_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Tighten reads to authenticated
DROP POLICY IF EXISTS "Anyone reads active channels" ON public.acquisition_channels;

CREATE POLICY "Authenticated read active channels"
  ON public.acquisition_channels FOR SELECT
  TO authenticated
  USING (is_active OR public.is_app_admin(auth.uid()));

-- =========================================================================
-- Step 1c: growth_systems_catalog alterations
-- =========================================================================
ALTER TABLE public.growth_systems_catalog
  DROP COLUMN IF EXISTS system_type;

ALTER TABLE public.growth_systems_catalog
  ADD COLUMN IF NOT EXISTS primary_objective TEXT,
  ADD COLUMN IF NOT EXISTS suitable_offer_tiers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS recommended_stages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS architecture JSONB,
  ADD COLUMN IF NOT EXISTS seed_template_id UUID REFERENCES public.seed_templates(id) ON DELETE SET NULL;

-- Validation trigger for tier / stage arrays
CREATE OR REPLACE FUNCTION public.validate_growth_system_catalog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_stage TEXT;
  v_allowed_tiers TEXT[] := ARRAY['free','low_ticket','mid_ticket','core','premium','continuity'];
  v_allowed_stages TEXT[] := ARRAY['validate','attract','optimize','scale','systemize'];
BEGIN
  IF NEW.suitable_offer_tiers IS NOT NULL THEN
    FOREACH v_tier IN ARRAY NEW.suitable_offer_tiers LOOP
      IF NOT (v_tier = ANY(v_allowed_tiers)) THEN
        RAISE EXCEPTION 'Invalid offer tier in suitable_offer_tiers: %', v_tier;
      END IF;
    END LOOP;
  END IF;

  IF NEW.recommended_stages IS NOT NULL THEN
    FOREACH v_stage IN ARRAY NEW.recommended_stages LOOP
      IF NOT (v_stage = ANY(v_allowed_stages)) THEN
        RAISE EXCEPTION 'Invalid roadmap stage in recommended_stages: %', v_stage;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_growth_system_catalog_trg ON public.growth_systems_catalog;
CREATE TRIGGER validate_growth_system_catalog_trg
  BEFORE INSERT OR UPDATE ON public.growth_systems_catalog
  FOR EACH ROW EXECUTE FUNCTION public.validate_growth_system_catalog();

-- Tighten reads to authenticated
DROP POLICY IF EXISTS "Anyone reads active growth systems" ON public.growth_systems_catalog;

CREATE POLICY "Authenticated read active growth systems"
  ON public.growth_systems_catalog FOR SELECT
  TO authenticated
  USING (is_active OR public.is_app_admin(auth.uid()));

-- =========================================================================
-- Step 1e: growth_architecture_systems — drop legacy channel column
-- =========================================================================
ALTER TABLE public.growth_architecture_systems
  DROP COLUMN IF EXISTS acquisition_channel_id;

-- =========================================================================
-- Step 1d: growth_architecture_channels (junction)
-- =========================================================================
CREATE TABLE public.growth_architecture_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  architecture_system_id UUID NOT NULL REFERENCES public.growth_architecture_systems(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.acquisition_channels(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (architecture_system_id, channel_id)
);

CREATE UNIQUE INDEX growth_arch_channels_one_primary_per_route
  ON public.growth_architecture_channels (architecture_system_id)
  WHERE is_primary = true;

CREATE INDEX growth_arch_channels_arch_idx
  ON public.growth_architecture_channels (architecture_system_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_architecture_channels TO authenticated;
GRANT ALL ON public.growth_architecture_channels TO service_role;

ALTER TABLE public.growth_architecture_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view route channels"
  ON public.growth_architecture_channels FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.growth_architecture_systems s
    WHERE s.id = architecture_system_id
      AND public.is_sub_account_member(auth.uid(), s.sub_account_id)
  ));

CREATE POLICY "Members insert route channels"
  ON public.growth_architecture_channels FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.growth_architecture_systems s
    WHERE s.id = architecture_system_id
      AND public.is_sub_account_member(auth.uid(), s.sub_account_id)
  ));

CREATE POLICY "Members update route channels"
  ON public.growth_architecture_channels FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.growth_architecture_systems s
    WHERE s.id = architecture_system_id
      AND public.is_sub_account_member(auth.uid(), s.sub_account_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.growth_architecture_systems s
    WHERE s.id = architecture_system_id
      AND public.is_sub_account_member(auth.uid(), s.sub_account_id)
  ));

CREATE POLICY "Members delete route channels"
  ON public.growth_architecture_channels FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.growth_architecture_systems s
    WHERE s.id = architecture_system_id
      AND public.is_sub_account_member(auth.uid(), s.sub_account_id)
  ));

CREATE TRIGGER growth_arch_channels_updated_at
  BEFORE UPDATE ON public.growth_architecture_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- Step 1f: growth_system_channel_compat
-- =========================================================================
CREATE TABLE public.growth_system_channel_compat (
  growth_system_id UUID NOT NULL REFERENCES public.growth_systems_catalog(id) ON DELETE CASCADE,
  acquisition_channel_id UUID NOT NULL REFERENCES public.acquisition_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (growth_system_id, acquisition_channel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_system_channel_compat TO authenticated;
GRANT ALL ON public.growth_system_channel_compat TO service_role;

ALTER TABLE public.growth_system_channel_compat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read compat"
  ON public.growth_system_channel_compat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage compat"
  ON public.growth_system_channel_compat FOR ALL
  TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));
