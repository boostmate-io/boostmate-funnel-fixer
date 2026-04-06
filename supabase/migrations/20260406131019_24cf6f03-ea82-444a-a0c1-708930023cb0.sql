
-- Seed templates table (not tied to any user)
CREATE TABLE public.seed_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Untitled Template',
  description text DEFAULT '',
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage seed templates"
ON public.seed_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update the existing new-user trigger function to also copy seed templates
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Copy all seed templates into the new user's personal template library
  INSERT INTO public.funnels (user_id, name, description, nodes, edges, is_template)
  SELECT NEW.id, st.name, st.description, st.nodes, st.edges, true
  FROM public.seed_templates st;

  RETURN NEW;
END;
$$;
