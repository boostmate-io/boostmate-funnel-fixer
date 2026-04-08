CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tmpl RECORD;
  new_funnel_id UUID;
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  FOR tmpl IN
    SELECT st.name, st.description, st.nodes, st.edges, st.brief_structure
    FROM public.seed_templates st
    WHERE st.is_active = true
  LOOP
    INSERT INTO public.funnels (user_id, name, description, nodes, edges, is_template)
    VALUES (NEW.id, tmpl.name, tmpl.description, tmpl.nodes, tmpl.edges, true)
    RETURNING id INTO new_funnel_id;

    -- If the seed template has a brief structure, create a brief for the cloned funnel
    IF tmpl.brief_structure IS NOT NULL
       AND tmpl.brief_structure != '{"sections":[]}'::jsonb
       AND jsonb_array_length(tmpl.brief_structure -> 'sections') > 0
    THEN
      INSERT INTO public.funnel_briefs (funnel_id, user_id, structure, "values")
      VALUES (new_funnel_id, NEW.id, tmpl.brief_structure, '{}'::jsonb);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;