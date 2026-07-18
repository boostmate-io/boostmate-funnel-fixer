
-- ============================================================
-- Growth Roadmap: assessments table
-- ============================================================

CREATE TABLE public.growth_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_account_id uuid REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  claim_token uuid UNIQUE,
  source text NOT NULL CHECK (source IN ('public','internal','auto')),
  answers jsonb NOT NULL,
  stage_scores jsonb NOT NULL,
  gate_results jsonb NOT NULL,
  computed_stage text NOT NULL,
  ai_result jsonb,
  ai_confidence text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_assessments TO authenticated;
GRANT ALL ON public.growth_assessments TO service_role;
GRANT SELECT, INSERT ON public.growth_assessments TO anon;

CREATE UNIQUE INDEX growth_assessments_one_active_per_sub
  ON public.growth_assessments (sub_account_id)
  WHERE is_active = true AND sub_account_id IS NOT NULL;

CREATE INDEX growth_assessments_sub_active_idx
  ON public.growth_assessments (sub_account_id, is_active, created_at DESC);
CREATE INDEX growth_assessments_claim_token_idx
  ON public.growth_assessments (claim_token) WHERE claim_token IS NOT NULL;

ALTER TABLE public.growth_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_own_workspace"
  ON public.growth_assessments FOR SELECT
  TO authenticated
  USING (sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid())));

CREATE POLICY "auth_insert_own_workspace"
  ON public.growth_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid()))
    AND source IN ('internal','auto')
  );

CREATE POLICY "auth_update_own_workspace"
  ON public.growth_assessments FOR UPDATE
  TO authenticated
  USING (sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid())))
  WITH CHECK (sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid())));

CREATE POLICY "auth_delete_own_workspace"
  ON public.growth_assessments FOR DELETE
  TO authenticated
  USING (sub_account_id IN (SELECT public.get_user_sub_accounts(auth.uid())));

CREATE POLICY "anon_insert_public_unclaimed"
  ON public.growth_assessments FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND sub_account_id IS NULL
    AND source = 'public'
    AND claim_token IS NOT NULL
    AND is_active = true
  );

-- Anon can read their own row when the token they .eq() on is still active
-- (unclaimed). The token itself is the secret.
CREATE POLICY "anon_select_by_claim_token"
  ON public.growth_assessments FOR SELECT
  TO anon
  USING (user_id IS NULL AND claim_token IS NOT NULL);

-- Immutability trigger: block non-service_role UPDATEs of core fields
CREATE OR REPLACE FUNCTION public.growth_assessments_lock_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  jwt_role text;
BEGIN
  BEGIN
    jwt_role := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.answers        := OLD.answers;
  NEW.stage_scores   := OLD.stage_scores;
  NEW.gate_results   := OLD.gate_results;
  NEW.computed_stage := OLD.computed_stage;
  NEW.source         := OLD.source;
  NEW.created_at     := OLD.created_at;
  NEW.ai_result      := OLD.ai_result;
  NEW.claim_token    := OLD.claim_token;
  NEW.user_id        := OLD.user_id;
  NEW.sub_account_id := OLD.sub_account_id;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER growth_assessments_lock_immutable_trg
  BEFORE UPDATE ON public.growth_assessments
  FOR EACH ROW EXECUTE FUNCTION public.growth_assessments_lock_immutable();

CREATE TRIGGER growth_assessments_updated_at_trg
  BEFORE UPDATE ON public.growth_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed Instruction Blocks (upsert by name — no unique constraint exists)
-- ============================================================

DO $seed$
DECLARE
  blocks jsonb := jsonb_build_array(
    jsonb_build_object('name','growth:framework','content',$b1$# Boostmate Growth Framework

Boostmate's Growth Roadmap divides business growth into five sequential stages. A business must satisfy the "gate" of each stage before it can meaningfully benefit from work on the next. Skipping ahead wastes effort.

## Stages

1. Validate — Prove the offer actually works.
   Bottleneck: no repeatable proof that the offer delivers the promised outcome.
   Objective: 5+ paying clients who received the promised result consistently.
   Milestone: outcome-delivery is proven and sales conversion is repeatable.

2. Attract — Build a repeatable lead flow.
   Bottleneck: leads are inconsistent, referral-dependent, or unmeasured.
   Objective: one primary lead source producing qualified leads every week.
   Milestone: known lead volume and lead-to-customer conversion rate.

3. Optimize — Increase revenue per lead and per customer.
   Bottleneck: leaky journey; no clear picture of where prospects drop off.
   Objective: improved conversion at each step of the customer journey and higher revenue per customer.
   Milestone: measurable lift in conversion or LTV.

4. Scale — Grow predictably without breaking the business.
   Bottleneck: unit economics or delivery capacity block growth.
   Objective: predictable acquisition (paid or otherwise) with healthy CAC/LTV, and delivery that holds up under volume.
   Milestone: profitable scaling channel plus fulfillment capacity.

5. Systemize — Reduce founder dependency and stabilize operations.
   Bottleneck: business relies on the founder for daily execution.
   Objective: recurring processes documented and delegated; owner works ON the business.
   Milestone: business runs a full week without owner intervention.

## Rules

- Stage is decided deterministically by scoring, not by the model. Never propose a different stage.
- Always work on the current stage's bottleneck first. Do not recommend Optimize work to a business still failing Validate.
- Priorities must be concrete next actions, not abstract advice.$b1$),
    jsonb_build_object('name','growth:analysis-rules','content',$b2$# Growth Assessment Analysis Rules

You will receive:
- The user's answer to each question (0/33/67/100 scale, plus contextual answers).
- The computed stage (deterministic — do not override).
- Contextual data: lead sources, testimonials indicator.

## What you produce

- next_priorities: exactly 3 concrete actions the user should take within the computed stage. Each must be specific enough that the user knows what to do this week — not a category, not a platitude.
- recommended_growth_system: one system id from the injected catalog (see "Available Growth Systems" in the user message).
- confidence: low | medium | high based on how clean the signal is (borderline gates → lower confidence).

## Rules

- Never invent a stage field. Stage is fixed.
- Never recommend a system that is not in the injected catalog.
- Priorities must reference the specific weakness in the answers. Cite the failing dimension in the rationale.
- If a gate is borderline (average within 10 of the threshold), acknowledge uncertainty in the rationale of at least one priority.
- Language: match the user's UI language.$b2$),
    jsonb_build_object('name','growth:recommendation-rules','content',$b3$# Growth System Recommendation Rules

You will receive an injected catalog under "## Available Growth Systems" in the user message. It is the only source of valid system ids.

## How to choose

1. Filter the catalog to systems whose stage_relevance includes the computed stage.
2. Among those, pick the single system that most directly addresses the primary failing dimension in the user's answers.
3. If no catalog entry is stage-relevant, pick the closest match and explain the tradeoff in rationale.

## Output

- Return recommended_growth_system.id — must match a catalog entry exactly.
- Return recommended_growth_system.rationale — one sentence, plain language.

## Never

- Never fabricate a system that isn't in the catalog.
- Never recommend based on what "sounds nice"; base it on the failing dimension.

Note for maintainers: this instruction block is intentionally list-agnostic. When the catalog changes (V2 dynamic injection), no edit here is required.$b3$)
  );
  b jsonb;
BEGIN
  FOR b IN SELECT jsonb_array_elements(blocks) LOOP
    IF EXISTS (SELECT 1 FROM public.ai_instruction_blocks WHERE name = b->>'name') THEN
      UPDATE public.ai_instruction_blocks SET content = b->>'content', updated_at = now() WHERE name = b->>'name';
    ELSE
      INSERT INTO public.ai_instruction_blocks (name, content) VALUES (b->>'name', b->>'content');
    END IF;
  END LOOP;
END
$seed$;

-- ============================================================
-- Seed AI Action
-- ============================================================

INSERT INTO public.ai_actions (slug, name, description, type, prompt_template, output_structure, model_settings, is_active)
VALUES (
  'growth_assessment_analysis',
  'Growth Assessment Analysis',
  'Generates the next priorities and recommended Growth System for a Growth Assessment. Stage is deterministic and NOT produced by the model.',
  'analysis',
$prompt$The user just completed the Growth Assessment.

## Computed stage (deterministic, do not override)
{{computed_stage}}

## Stage scores
{{stage_scores}}

## Gate results
{{gate_results}}

## Answers
{{answers}}

## Contextual data
- Lead sources (multi-select): {{lead_sources}}
- Testimonials indicator: {{testimonials}}
- Language: {{language}}

## Available Growth Systems
{{growth_systems_catalog}}

Produce next_priorities (exactly 3, actionable, tied to the computed stage's bottleneck) and recommended_growth_system (id must exist in the catalog above). Set confidence to low/medium/high.$prompt$,
  '[
    {"key":"next_priorities","label":"Next Priorities","type":"object_array","item_schema":[
      {"key":"title","type":"string","label":"Priority title"},
      {"key":"rationale","type":"string","label":"Why this matters right now"},
      {"key":"related_module","type":"string","label":"Related module id (blueprint|offer-creator|funnels|copy|analytics|outreach|coach|assets|none)"}
    ]},
    {"key":"recommended_growth_system","label":"Recommended Growth System","type":"object_array","item_schema":[
      {"key":"id","type":"string","label":"System id from the injected catalog"},
      {"key":"rationale","type":"string","label":"One-sentence rationale"}
    ]},
    {"key":"confidence","label":"Confidence","type":"string"}
  ]'::jsonb,
  '{"model":"google/gemini-2.5-flash","temperature":0.4}'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  prompt_template = EXCLUDED.prompt_template,
  output_structure = EXCLUDED.output_structure,
  model_settings = EXCLUDED.model_settings,
  is_active = true,
  updated_at = now();

-- Link instruction blocks to the AI Action
WITH action_row AS (
  SELECT id FROM public.ai_actions WHERE slug = 'growth_assessment_analysis'
), blocks AS (
  SELECT id, name FROM public.ai_instruction_blocks
  WHERE name IN ('growth:framework','growth:analysis-rules','growth:recommendation-rules')
)
INSERT INTO public.ai_action_instruction_blocks (ai_action_id, instruction_block_id, sort_order)
SELECT (SELECT id FROM action_row), b.id,
  CASE b.name
    WHEN 'growth:framework' THEN 1
    WHEN 'growth:analysis-rules' THEN 2
    WHEN 'growth:recommendation-rules' THEN 3
  END
FROM blocks b
ON CONFLICT (ai_action_id, instruction_block_id) DO NOTHING;
