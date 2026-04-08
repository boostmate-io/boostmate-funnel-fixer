CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_main_id uuid;
  new_sub_id uuid;
  tmpl RECORD;
  new_funnel_id uuid;
  acct_type text;
  acct_name text;
  v_invite_code text;
  v_invite RECORD;
BEGIN
  -- Always create the user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Check if this signup is via an invite
  v_invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  IF v_invite_code IS NOT NULL AND v_invite_code != '' THEN
    -- Find the invite
    SELECT * INTO v_invite FROM public.account_invites 
    WHERE invite_code = v_invite_code AND status = 'pending' 
    LIMIT 1;
    
    IF v_invite.id IS NOT NULL THEN
      -- Create profile but don't create new account structure
      -- Add membership to the main account
      INSERT INTO public.account_memberships (user_id, main_account_id, role)
      VALUES (NEW.id, v_invite.main_account_id, 'member')
      ON CONFLICT DO NOTHING;
      
      -- Add membership to the sub account if specified
      IF v_invite.sub_account_id IS NOT NULL THEN
        INSERT INTO public.account_memberships (user_id, main_account_id, sub_account_id, role)
        VALUES (NEW.id, v_invite.main_account_id, v_invite.sub_account_id, COALESCE(v_invite.role::text, 'workspace_member')::membership_role)
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Mark invite as accepted
      UPDATE public.account_invites SET status = 'accepted' WHERE id = v_invite.id;
      
      RETURN NEW;
    END IF;
  END IF;

  -- Normal signup flow: create account structure
  acct_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'standard');
  acct_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'account_name'), ''), 
    CASE WHEN acct_type = 'agency' THEN 'Agency Account' ELSE 'My Account' END);

  INSERT INTO public.main_accounts (name, type)
  VALUES (
    acct_name,
    CASE WHEN acct_type = 'agency' THEN 'agency'::main_account_type ELSE 'standard'::main_account_type END
  )
  RETURNING id INTO new_main_id;

  INSERT INTO public.sub_accounts (main_account_id, name, is_default)
  VALUES (new_main_id, acct_name, true)
  RETURNING id INTO new_sub_id;

  INSERT INTO public.account_memberships (user_id, main_account_id, role)
  VALUES (NEW.id, new_main_id, 'owner');

  INSERT INTO public.account_memberships (user_id, main_account_id, sub_account_id, role)
  VALUES (NEW.id, new_main_id, new_sub_id, 'workspace_admin');

  FOR tmpl IN
    SELECT st.name, st.description, st.nodes, st.edges, st.brief_structure
    FROM public.seed_templates st
    WHERE st.is_active = true
  LOOP
    INSERT INTO public.funnels (user_id, sub_account_id, name, description, nodes, edges, is_template)
    VALUES (NEW.id, new_sub_id, tmpl.name, tmpl.description, tmpl.nodes, tmpl.edges, true)
    RETURNING id INTO new_funnel_id;

    IF tmpl.brief_structure IS NOT NULL
       AND tmpl.brief_structure != '{"sections":[]}'::jsonb
       AND jsonb_array_length(tmpl.brief_structure -> 'sections') > 0
    THEN
      INSERT INTO public.funnel_briefs (funnel_id, user_id, sub_account_id, structure, "values")
      VALUES (new_funnel_id, NEW.id, new_sub_id, tmpl.brief_structure, '{}'::jsonb);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$