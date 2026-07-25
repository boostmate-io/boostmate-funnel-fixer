
-- 1. funnels.status column
ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'building'
    CHECK (status IN ('building','live','paused','archived'));

UPDATE public.funnels SET status = 'building' WHERE status IS NULL;

-- 2. Relax target_offer_id NOT NULL
ALTER TABLE public.growth_architecture_systems
  ALTER COLUMN target_offer_id DROP NOT NULL;

-- 3. Drop validation trigger + function (offer-relationship prerequisite gone)
DROP TRIGGER IF EXISTS validate_growth_architecture_route_trg ON public.growth_architecture_systems;
DROP TRIGGER IF EXISTS trg_validate_growth_architecture_route ON public.growth_architecture_systems;
DROP FUNCTION IF EXISTS public.validate_growth_architecture_route();

-- 4. funnel_connections
CREATE TABLE IF NOT EXISTS public.funnel_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id    uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  source_funnel_id  uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  target_funnel_id  uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funnel_connections_no_self CHECK (source_funnel_id <> target_funnel_id),
  CONSTRAINT funnel_connections_unique UNIQUE (source_funnel_id, target_funnel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_connections TO authenticated;
GRANT ALL ON public.funnel_connections TO service_role;

ALTER TABLE public.funnel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace funnel connections"
  ON public.funnel_connections FOR SELECT TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can insert workspace funnel connections"
  ON public.funnel_connections FOR INSERT TO authenticated
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can update workspace funnel connections"
  ON public.funnel_connections FOR UPDATE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE POLICY "Members can delete workspace funnel connections"
  ON public.funnel_connections FOR DELETE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id));

CREATE INDEX IF NOT EXISTS idx_funnel_connections_target ON public.funnel_connections(target_funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_connections_source ON public.funnel_connections(source_funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_connections_sub ON public.funnel_connections(sub_account_id);

CREATE TRIGGER trg_funnel_connections_updated_at
  BEFORE UPDATE ON public.funnel_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Backfill funnel_connections from offer_relationships where both endpoints
-- have a built funnel in the same workspace.
INSERT INTO public.funnel_connections (sub_account_id, source_funnel_id, target_funnel_id)
SELECT DISTINCT sf.sub_account_id, sf.id, tf.id
FROM public.offer_relationships r
JOIN public.funnels sf ON sf.linked_offer_id = r.source_offer_id AND sf.sub_account_id = r.sub_account_id
JOIN public.funnels tf ON tf.linked_offer_id = r.target_offer_id AND tf.sub_account_id = r.sub_account_id
WHERE sf.id <> tf.id
ON CONFLICT DO NOTHING;
