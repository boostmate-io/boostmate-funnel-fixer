
-- =========================================
-- Business Blueprint V3: Growth Architecture
-- =========================================

-- 1. offer_relationships: typed edges between offers
CREATE TABLE public.offer_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id UUID NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  source_offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  target_offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('ascends_to','leads_into','retention','downsell')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT offer_relationships_no_self CHECK (source_offer_id <> target_offer_id),
  CONSTRAINT offer_relationships_unique UNIQUE (source_offer_id, target_offer_id, relationship_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_relationships TO authenticated;
GRANT ALL ON public.offer_relationships TO service_role;

ALTER TABLE public.offer_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view offer relationships"
  ON public.offer_relationships FOR SELECT TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members insert offer relationships"
  ON public.offer_relationships FOR INSERT TO authenticated
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members update offer relationships"
  ON public.offer_relationships FOR UPDATE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members delete offer relationships"
  ON public.offer_relationships FOR DELETE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE INDEX idx_offer_rel_sub ON public.offer_relationships(sub_account_id);
CREATE INDEX idx_offer_rel_source ON public.offer_relationships(source_offer_id);
CREATE INDEX idx_offer_rel_target ON public.offer_relationships(target_offer_id);

CREATE TRIGGER trg_offer_relationships_updated_at
  BEFORE UPDATE ON public.offer_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. acquisition_channels: admin-managed catalog of channels
CREATE TABLE public.acquisition_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acquisition_channels TO authenticated, anon;
GRANT ALL ON public.acquisition_channels TO service_role;

ALTER TABLE public.acquisition_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active channels"
  ON public.acquisition_channels FOR SELECT
  USING (is_active OR public.is_app_admin(auth.uid()));

CREATE POLICY "Admins manage channels"
  ON public.acquisition_channels FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER trg_acquisition_channels_updated_at
  BEFORE UPDATE ON public.acquisition_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. growth_systems_catalog: admin-managed catalog of growth systems
CREATE TABLE public.growth_systems_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  system_type TEXT NOT NULL CHECK (system_type IN ('acquisition','ascension','retention','referral','other')),
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.growth_systems_catalog TO authenticated, anon;
GRANT ALL ON public.growth_systems_catalog TO service_role;

ALTER TABLE public.growth_systems_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active growth systems"
  ON public.growth_systems_catalog FOR SELECT
  USING (is_active OR public.is_app_admin(auth.uid()));

CREATE POLICY "Admins manage growth systems"
  ON public.growth_systems_catalog FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER trg_growth_systems_catalog_updated_at
  BEFORE UPDATE ON public.growth_systems_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 4. growth_architecture_systems: workspace-level configured systems (routes)
-- Represents either an external acquisition route (source_offer_id NULL)
-- or an offer-to-offer route (source + target offer, must correspond to an existing offer_relationship).
CREATE TABLE public.growth_architecture_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id UUID NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  system_catalog_id UUID NOT NULL REFERENCES public.growth_systems_catalog(id) ON DELETE RESTRICT,
  source_offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
  target_offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  acquisition_channel_id UUID REFERENCES public.acquisition_channels(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','retired')),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gas_no_self CHECK (source_offer_id IS NULL OR source_offer_id <> target_offer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_architecture_systems TO authenticated;
GRANT ALL ON public.growth_architecture_systems TO service_role;

ALTER TABLE public.growth_architecture_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view growth architecture systems"
  ON public.growth_architecture_systems FOR SELECT TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members insert growth architecture systems"
  ON public.growth_architecture_systems FOR INSERT TO authenticated
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members update growth architecture systems"
  ON public.growth_architecture_systems FOR UPDATE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members delete growth architecture systems"
  ON public.growth_architecture_systems FOR DELETE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE INDEX idx_gas_sub ON public.growth_architecture_systems(sub_account_id);
CREATE INDEX idx_gas_target ON public.growth_architecture_systems(target_offer_id);
CREATE INDEX idx_gas_source ON public.growth_architecture_systems(source_offer_id);

CREATE TRIGGER trg_growth_architecture_systems_updated_at
  BEFORE UPDATE ON public.growth_architecture_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce that offer-to-offer routes correspond to an existing offer_relationship
CREATE OR REPLACE FUNCTION public.validate_growth_architecture_route()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source_offer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.offer_relationships
      WHERE source_offer_id = NEW.source_offer_id
        AND target_offer_id = NEW.target_offer_id
    ) THEN
      RAISE EXCEPTION 'No offer_relationship exists for source % -> target %', NEW.source_offer_id, NEW.target_offer_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_growth_architecture_route
  BEFORE INSERT OR UPDATE ON public.growth_architecture_systems
  FOR EACH ROW EXECUTE FUNCTION public.validate_growth_architecture_route();


-- =========================================
-- Seed catalogs
-- =========================================

INSERT INTO public.acquisition_channels (key, label, description, category, sort_order) VALUES
  ('paid_search',      'Paid Search',            'Google Ads, Bing Ads',                     'paid',    10),
  ('paid_social',      'Paid Social',            'Meta, TikTok, LinkedIn ads',               'paid',    20),
  ('youtube_ads',      'YouTube Ads',            'Video ads on YouTube',                     'paid',    30),
  ('seo',              'SEO / Organic Search',   'Organic traffic from search engines',      'organic', 40),
  ('organic_social',   'Organic Social',         'Content on social platforms',              'organic', 50),
  ('youtube_organic',  'YouTube Organic',        'Organic YouTube channel',                  'organic', 60),
  ('email',            'Email Marketing',        'Newsletter, list nurture, broadcasts',     'owned',   70),
  ('partnerships',     'Partnerships / JV',      'Joint ventures, affiliates, integrations', 'partner', 80),
  ('outbound',         'Outbound / DM',          'Cold outreach, DMs, cold email',           'outbound',90),
  ('referrals',        'Referrals',              'Word of mouth, referral program',          'owned',  100),
  ('events',           'Events / Speaking',      'Live events, webinars, podcasts',          'other',  110);

INSERT INTO public.growth_systems_catalog (key, label, description, system_type, sort_order) VALUES
  ('lead_capture_funnel', 'Lead Capture Funnel', 'Opt-in → nurture → offer',                 'acquisition', 10),
  ('vsl_funnel',          'VSL / Sales Funnel',  'Video sales letter → book call / buy',     'acquisition', 20),
  ('webinar_funnel',      'Webinar Funnel',      'Registration → live/evergreen → offer',    'acquisition', 30),
  ('ascension_path',      'Ascension Path',      'Move existing customers to higher offer',  'ascension',   40),
  ('retention_system',    'Retention System',    'Onboarding, renewals, community',          'retention',   50);
