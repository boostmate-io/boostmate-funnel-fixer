
ALTER TABLE public.seed_templates ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.funnels (user_id, name, description, nodes, edges, is_template)
  SELECT NEW.id, st.name, st.description, st.nodes, st.edges, true
  FROM public.seed_templates st
  WHERE st.is_active = true;

  RETURN NEW;
END;
$$;
