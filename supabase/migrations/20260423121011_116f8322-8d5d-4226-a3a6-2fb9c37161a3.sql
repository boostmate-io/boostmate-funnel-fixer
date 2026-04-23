-- Add tier and source columns to offers so the Offer Ecosystem can group them
-- and link them back to a business blueprint as the source of truth.

-- Tier column: which ladder section the offer belongs to.
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'core';

-- Source column: where the offer originated (manual entry, blueprint auto-gen, etc.)
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Optional link to the blueprint that owns this offer (for the auto-generated core offer
-- and any offer created from inside the Offer Ecosystem builder).
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS blueprint_id uuid NULL
    REFERENCES public.business_blueprints(id) ON DELETE SET NULL;

-- Sort order within a tier (drag-to-reorder support later).
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Light validation on tier values via trigger (CHECK constraints would be too rigid
-- if we ever add more tiers; per project rules we use validation triggers).
CREATE OR REPLACE FUNCTION public.validate_offer_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tier NOT IN ('free', 'low_ticket', 'mid_ticket', 'core', 'premium', 'continuity') THEN
    RAISE EXCEPTION 'Invalid offer tier: %', NEW.tier;
  END IF;
  IF NEW.source NOT IN ('manual', 'blueprint_core', 'blueprint_manual') THEN
    RAISE EXCEPTION 'Invalid offer source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_offer_tier_trigger ON public.offers;
CREATE TRIGGER validate_offer_tier_trigger
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.validate_offer_tier();

-- Helpful index for ecosystem queries.
CREATE INDEX IF NOT EXISTS idx_offers_blueprint_tier
  ON public.offers (blueprint_id, tier, sort_order);
