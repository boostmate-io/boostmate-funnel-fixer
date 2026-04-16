
-- Copy Components: admin-managed reusable component definitions
CREATE TABLE public.copy_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  ai_action_slug text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  ui_interface_slug text NOT NULL DEFAULT 'generic_ui',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage copy_components"
  ON public.copy_components FOR ALL TO authenticated
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));

CREATE POLICY "Authenticated users can read copy_components"
  ON public.copy_components FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_copy_components_updated_at
  BEFORE UPDATE ON public.copy_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Copy Documents: structured content documents
CREATE TABLE public.copy_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Document',
  type text NOT NULL DEFAULT 'sales_copy',
  context_type text NOT NULL DEFAULT 'custom',
  context_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  context_custom_text text NOT NULL DEFAULT '',
  global_instructions text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own copy_documents"
  ON public.copy_documents FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sub account members can manage copy_documents"
  ON public.copy_documents FOR ALL TO authenticated
  USING ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()))
  WITH CHECK ((sub_account_id IN (SELECT get_user_sub_accounts(auth.uid()))) OR is_app_admin(auth.uid()));

CREATE POLICY "Agency can manage client copy_documents"
  ON public.copy_documents FOR ALL TO authenticated
  USING (is_agency_of(auth.uid(), user_id))
  WITH CHECK (is_agency_of(auth.uid(), user_id));

CREATE TRIGGER update_copy_documents_updated_at
  BEFORE UPDATE ON public.copy_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Copy Document Components: components within a document
CREATE TABLE public.copy_document_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.copy_documents(id) ON DELETE CASCADE,
  component_slug text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_document_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own document_components"
  ON public.copy_document_components FOR ALL TO authenticated
  USING (document_id IN (SELECT id FROM public.copy_documents WHERE user_id = auth.uid()))
  WITH CHECK (document_id IN (SELECT id FROM public.copy_documents WHERE user_id = auth.uid()));

CREATE POLICY "Sub account members can manage document_components"
  ON public.copy_document_components FOR ALL TO authenticated
  USING (document_id IN (SELECT id FROM public.copy_documents WHERE sub_account_id IN (SELECT get_user_sub_accounts(auth.uid())) OR is_app_admin(auth.uid()) = true))
  WITH CHECK (document_id IN (SELECT id FROM public.copy_documents WHERE sub_account_id IN (SELECT get_user_sub_accounts(auth.uid())) OR is_app_admin(auth.uid()) = true));

CREATE TRIGGER update_copy_document_components_updated_at
  BEFORE UPDATE ON public.copy_document_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Copy Frameworks: predefined component structures
CREATE TABLE public.copy_frameworks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  component_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  type text NOT NULL DEFAULT 'sales_copy',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage copy_frameworks"
  ON public.copy_frameworks FOR ALL TO authenticated
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));

CREATE POLICY "Authenticated users can read copy_frameworks"
  ON public.copy_frameworks FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_copy_frameworks_updated_at
  BEFORE UPDATE ON public.copy_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
