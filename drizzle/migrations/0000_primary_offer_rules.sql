CREATE OR REPLACE FUNCTION public.validate_offer_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tier NOT IN ('free', 'low_ticket', 'mid_ticket', 'core', 'premium', 'continuity') THEN
    RAISE EXCEPTION 'Invalid offer tier: %', NEW.tier;
  END IF;
  IF NEW.source NOT IN ('manual', 'blueprint_core', 'blueprint_manual') THEN
    RAISE EXCEPTION 'Invalid offer source: %', NEW.source;
  END IF;
  IF NEW.source = 'blueprint_core' THEN
    -- Blueprint deleted (FK ON DELETE SET NULL): keep the record and its
    -- content/funnel links, but it is no longer a primary offer.
    IF NEW.blueprint_id IS NULL AND TG_OP = 'UPDATE' AND OLD.blueprint_id IS NOT NULL THEN
      NEW.source := 'manual';
    ELSIF NEW.blueprint_id IS NULL THEN
      RAISE EXCEPTION 'A primary core offer must belong to a blueprint';
    ELSIF NEW.tier <> 'core' THEN
      RAISE EXCEPTION 'A primary core offer must use the core tier';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_primary_core_requires_blueprint
  CHECK (source <> 'blueprint_core' OR (blueprint_id IS NOT NULL AND tier = 'core'));