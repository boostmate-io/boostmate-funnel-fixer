CREATE OR REPLACE FUNCTION public.validate_offer_relationship_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.offers WHERE id = NEW.source_offer_id AND sub_account_id = NEW.sub_account_id) THEN
    RAISE EXCEPTION 'Source offer does not belong to this workspace' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.offers WHERE id = NEW.target_offer_id AND sub_account_id = NEW.sub_account_id) THEN
    RAISE EXCEPTION 'Target offer does not belong to this workspace' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offer_relationships_workspace
  BEFORE INSERT OR UPDATE ON public.offer_relationships
  FOR EACH ROW EXECUTE FUNCTION public.validate_offer_relationship_workspace();

DROP POLICY IF EXISTS "Members view offer relationships" ON public.offer_relationships;
DROP POLICY IF EXISTS "Members insert offer relationships" ON public.offer_relationships;
DROP POLICY IF EXISTS "Members update offer relationships" ON public.offer_relationships;
DROP POLICY IF EXISTS "Members delete offer relationships" ON public.offer_relationships;

CREATE POLICY "Members or admins view offer relationships" ON public.offer_relationships
  FOR SELECT TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()));
CREATE POLICY "Members or admins insert offer relationships" ON public.offer_relationships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()));
CREATE POLICY "Members or admins update offer relationships" ON public.offer_relationships
  FOR UPDATE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()));
CREATE POLICY "Members or admins delete offer relationships" ON public.offer_relationships
  FOR DELETE TO authenticated
  USING (public.is_sub_account_member(auth.uid(), sub_account_id) OR public.is_app_admin(auth.uid()));