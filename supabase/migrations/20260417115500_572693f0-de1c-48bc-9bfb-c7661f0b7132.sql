CREATE TABLE public.business_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_account_id UUID NOT NULL UNIQUE REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  customer_clarity JSONB NOT NULL DEFAULT '{}'::jsonb,
  offer_stack JSONB NOT NULL DEFAULT '{}'::jsonb,
  growth_system JSONB NOT NULL DEFAULT '{}'::jsonb,
  brand_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  proof_authority JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub account members can manage business_blueprints"
ON public.business_blueprints
FOR ALL
TO authenticated
USING ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()))
WITH CHECK ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()));

CREATE POLICY "Agency can manage client business_blueprints"
ON public.business_blueprints
FOR ALL
TO authenticated
USING (is_agency_of(auth.uid(), user_id))
WITH CHECK (is_agency_of(auth.uid(), user_id));

CREATE POLICY "Users can manage own business_blueprints"
ON public.business_blueprints
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_business_blueprints_updated_at
BEFORE UPDATE ON public.business_blueprints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_business_blueprints_sub_account ON public.business_blueprints(sub_account_id);