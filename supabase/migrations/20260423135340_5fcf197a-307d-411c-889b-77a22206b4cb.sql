-- Reset existing growth_system JSON to clean slate (new structure)
UPDATE public.business_blueprints
SET growth_system = '{}'::jsonb
WHERE growth_system IS NOT NULL;

-- Create growth_funnel_mappings table
CREATE TABLE public.growth_funnel_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES public.business_blueprints(id) ON DELETE CASCADE,
  sub_account_id UUID NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  funnel_type TEXT NOT NULL DEFAULT 'lead_magnet',
  purpose TEXT NOT NULL DEFAULT '',
  traffic_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_funnel_mappings_blueprint ON public.growth_funnel_mappings(blueprint_id);
CREATE INDEX idx_growth_funnel_mappings_sub_account ON public.growth_funnel_mappings(sub_account_id);

-- Enable RLS
ALTER TABLE public.growth_funnel_mappings ENABLE ROW LEVEL SECURITY;

-- Policies (mirror business_blueprints pattern)
CREATE POLICY "Users can manage own funnel mappings"
ON public.growth_funnel_mappings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sub account members can manage funnel mappings"
ON public.growth_funnel_mappings
FOR ALL
TO authenticated
USING ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()))
WITH CHECK ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()));

CREATE POLICY "Agency can manage client funnel mappings"
ON public.growth_funnel_mappings
FOR ALL
TO authenticated
USING (is_agency_of(auth.uid(), user_id))
WITH CHECK (is_agency_of(auth.uid(), user_id));

-- updated_at trigger
CREATE TRIGGER update_growth_funnel_mappings_updated_at
BEFORE UPDATE ON public.growth_funnel_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();