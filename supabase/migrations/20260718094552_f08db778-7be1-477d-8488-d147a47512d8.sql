
-- Atomic Growth Roadmap cycle transition RPC.
CREATE OR REPLACE FUNCTION public.growth_cycle_transition(
  _sub_account_id uuid,
  _action text,
  _stage text DEFAULT NULL,
  _from_stage text DEFAULT NULL,
  _to_stage text DEFAULT NULL,
  _assessment_id uuid DEFAULT NULL,
  _expected_cycle_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_active_id uuid;
  v_active_number int;
  v_new_id uuid;
  v_result jsonb;
BEGIN
  -- Membership check (service role bypasses via auth.uid() IS NULL when called with service key;
  -- allow that path so edge functions using service role can act).
  IF v_uid IS NOT NULL AND NOT public.is_sub_account_member(v_uid, _sub_account_id) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501';
  END IF;

  IF _action = 'start_initial_cycle' THEN
    IF _stage IS NULL THEN RAISE EXCEPTION 'stage_required'; END IF;

    SELECT id INTO v_active_id
    FROM public.growth_stage_cycles
    WHERE sub_account_id = _sub_account_id AND stage = _stage AND ended_at IS NULL
    LIMIT 1;

    IF v_active_id IS NOT NULL THEN
      SELECT to_jsonb(c.*) INTO v_result FROM public.growth_stage_cycles c WHERE id = v_active_id;
      RETURN jsonb_build_object('status', 'noop_existing', 'cycle', v_result);
    END IF;

    INSERT INTO public.growth_stage_cycles (sub_account_id, stage, cycle_number, started_by_reason)
    VALUES (_sub_account_id, _stage, 1, COALESCE(_reason, 'initial'))
    RETURNING id INTO v_new_id;

    SELECT to_jsonb(c.*) INTO v_result FROM public.growth_stage_cycles c WHERE id = v_new_id;
    RETURN jsonb_build_object('status', 'started', 'cycle', v_result);

  ELSIF _action = 'advance_stage' THEN
    IF _to_stage IS NULL THEN RAISE EXCEPTION 'to_stage_required'; END IF;

    -- Idempotency: if a matching close already happened for this assessment on from_stage
    -- AND there's already an active cycle on to_stage, return no-op.
    IF _from_stage IS NOT NULL AND _assessment_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.growth_stage_cycles
        WHERE sub_account_id = _sub_account_id
          AND stage = _from_stage
          AND ended_by_assessment_id = _assessment_id
      ) AND EXISTS (
        SELECT 1 FROM public.growth_stage_cycles
        WHERE sub_account_id = _sub_account_id
          AND stage = _to_stage
          AND ended_at IS NULL
      ) THEN
        SELECT to_jsonb(c.*) INTO v_result
        FROM public.growth_stage_cycles c
        WHERE sub_account_id = _sub_account_id AND stage = _to_stage AND ended_at IS NULL
        LIMIT 1;
        RETURN jsonb_build_object('status', 'noop_idempotent', 'cycle', v_result);
      END IF;
    END IF;

    -- Close active cycle on from_stage if present.
    IF _from_stage IS NOT NULL THEN
      UPDATE public.growth_stage_cycles
      SET ended_at = now(),
          ended_by_reason = COALESCE(_reason, 'assessment_advance'),
          ended_by_assessment_id = _assessment_id
      WHERE sub_account_id = _sub_account_id
        AND stage = _from_stage
        AND ended_at IS NULL;
    END IF;

    -- Open cycle on to_stage if none active.
    SELECT id INTO v_active_id
    FROM public.growth_stage_cycles
    WHERE sub_account_id = _sub_account_id AND stage = _to_stage AND ended_at IS NULL
    LIMIT 1;

    IF v_active_id IS NULL THEN
      SELECT COALESCE(MAX(cycle_number), 0) INTO v_active_number
      FROM public.growth_stage_cycles
      WHERE sub_account_id = _sub_account_id AND stage = _to_stage;

      INSERT INTO public.growth_stage_cycles (sub_account_id, stage, cycle_number, started_by_reason)
      VALUES (_sub_account_id, _to_stage, v_active_number + 1, COALESCE(_reason, 'assessment_advance'))
      RETURNING id INTO v_new_id;
    ELSE
      v_new_id := v_active_id;
    END IF;

    SELECT to_jsonb(c.*) INTO v_result FROM public.growth_stage_cycles c WHERE id = v_new_id;
    RETURN jsonb_build_object('status', 'advanced', 'cycle', v_result);

  ELSIF _action = 'restart_cycle' THEN
    IF _stage IS NULL OR _expected_cycle_id IS NULL THEN
      RAISE EXCEPTION 'stage_and_expected_cycle_required';
    END IF;

    SELECT id, cycle_number INTO v_active_id, v_active_number
    FROM public.growth_stage_cycles
    WHERE sub_account_id = _sub_account_id AND stage = _stage AND ended_at IS NULL
    LIMIT 1;

    IF v_active_id IS NULL OR v_active_id <> _expected_cycle_id THEN
      RAISE EXCEPTION 'stale_cycle_id' USING ERRCODE = '40001';
    END IF;

    UPDATE public.growth_stage_cycles
    SET ended_at = now(),
        ended_by_reason = COALESCE(_reason, 'user_restart'),
        ended_by_assessment_id = _assessment_id
    WHERE id = v_active_id;

    INSERT INTO public.growth_stage_cycles (sub_account_id, stage, cycle_number, started_by_reason)
    VALUES (_sub_account_id, _stage, v_active_number + 1, COALESCE(_reason, 'user_restart'))
    RETURNING id INTO v_new_id;

    SELECT to_jsonb(c.*) INTO v_result FROM public.growth_stage_cycles c WHERE id = v_new_id;
    RETURN jsonb_build_object('status', 'restarted', 'cycle', v_result);

  ELSIF _action = 'complete_terminal' THEN
    -- Mark workspace as roadmap-completed and close any active Systemize cycle.
    UPDATE public.growth_stage_cycles
    SET ended_at = now(),
        ended_by_reason = COALESCE(_reason, 'roadmap_completed'),
        ended_by_assessment_id = _assessment_id
    WHERE sub_account_id = _sub_account_id
      AND stage = 'systemize'
      AND ended_at IS NULL;

    INSERT INTO public.growth_workspace_state (sub_account_id, state)
    VALUES (
      _sub_account_id,
      jsonb_build_object(
        'roadmap_completed', true,
        'roadmap_completed_at', now(),
        'completed_by_assessment_id', _assessment_id
      )
    )
    ON CONFLICT (sub_account_id) DO UPDATE
      SET state = public.growth_workspace_state.state
                  || jsonb_build_object(
                       'roadmap_completed', true,
                       'roadmap_completed_at', now(),
                       'completed_by_assessment_id', _assessment_id
                     ),
          updated_at = now();

    RETURN jsonb_build_object('status', 'completed');

  ELSE
    RAISE EXCEPTION 'unknown_action: %', _action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.growth_cycle_transition(uuid, text, text, text, text, uuid, uuid, text)
  TO authenticated, service_role;
