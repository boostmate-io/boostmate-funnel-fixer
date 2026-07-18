
CREATE OR REPLACE FUNCTION public.growth_workspace_state_set(
  _sub_account_id uuid,
  _patch jsonb DEFAULT '{}'::jsonb,
  _delete_keys text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current jsonb;
  v_new jsonb;
  v_key text;
BEGIN
  IF v_uid IS NOT NULL AND NOT public.is_sub_account_member(v_uid, _sub_account_id) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.growth_workspace_state (sub_account_id, state)
  VALUES (_sub_account_id, '{}'::jsonb)
  ON CONFLICT (sub_account_id) DO NOTHING;

  SELECT state INTO v_current
  FROM public.growth_workspace_state
  WHERE sub_account_id = _sub_account_id
  FOR UPDATE;

  v_new := COALESCE(v_current, '{}'::jsonb) || COALESCE(_patch, '{}'::jsonb);

  IF _delete_keys IS NOT NULL THEN
    FOREACH v_key IN ARRAY _delete_keys LOOP
      -- Support dotted paths like "attract.chosenChannel" — remove nested key.
      IF position('.' in v_key) > 0 THEN
        v_new := jsonb_set(
          v_new,
          string_to_array(v_key, '.'),
          'null'::jsonb,
          false
        );
        -- Then strip nulls by re-composing without them.
        v_new := v_new #- string_to_array(v_key, '.');
      ELSE
        v_new := v_new - v_key;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.growth_workspace_state
  SET state = v_new, updated_at = now()
  WHERE sub_account_id = _sub_account_id;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.growth_workspace_state_set(uuid, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.growth_workspace_state_set(uuid, jsonb, text[]) TO authenticated, service_role;
