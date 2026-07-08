
-- ============================================================
-- 1. Schema: extend copy_components with headline config
-- ============================================================
ALTER TABLE public.copy_components
  ADD COLUMN IF NOT EXISTS headline_purpose text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS headline_instruction_block_id uuid
    REFERENCES public.ai_instruction_blocks(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.copy_components.headline_purpose IS
  'How the main headline of this component behaves. One of: section_introduction, persuasive, cta, story, proof, none. Drives which instruction block is injected when a headline field is generated.';
COMMENT ON COLUMN public.copy_components.headline_instruction_block_id IS
  'Optional explicit instruction block used to steer headline generation. If NULL, generator resolves a default block via headline_purpose.';

-- ============================================================
-- 2. Seed reusable headline-purpose instruction blocks
--    (idempotent: only insert if a block with that name doesn't exist)
-- ============================================================
INSERT INTO public.ai_instruction_blocks (name, content)
SELECT * FROM (VALUES
  (
    'Headline Purpose — Section Introduction',
$block$## HEADLINE PURPOSE — SECTION INTRODUCTION (CRITICAL)

The main headline of this component (fields like "headline" / "section_headline")
is a SECTION INTRODUCTION, not a persuasive marketing headline.

Its job is to INTRODUCE the content that follows (the list, cards, stats,
FAQs, guarantees, steps, etc.), not to become the first item itself.

Rules for the section-intro headline:
- Transition naturally from the previous section.
- Prepare the reader for what they are about to see below.
- Prioritise CLARITY over cleverness or emotion.
- Keep it short and conversational.
- NEVER phrase it as a standalone pain, benefit, outcome, or result — those
  belong in the items below.
- Do not repeat or spoil the content of the items.

Good examples by section type:
- Pain Points:            "Does any of this sound familiar?" / "I imagine you're feeling a little like this…" / "If you're like most people we work with…"
- Desired Outcomes:       "We help people who want to…" / "This is for you if you want to…"
- Results Proof:          "Here's proof that it works." / "Real results from people just like you."
- Additional Results:     "More client success stories." / "More proof that this works."
- Core Outcomes:          "Here's what you can expect." / "The outcomes this program is designed to deliver."
- Program & Deliverables: "Here's what's included." / "Everything you'll receive."
- Process / Mechanism:    "Here's how it works." / "Our step-by-step process."
- Guarantee:              "Our 30-day guarantee." / "You're fully protected."
- FAQ:                    "Frequently asked questions." / "Everything you might be wondering."
- Urgency / Decision:     "Ready to move forward?" / "Your next step starts here."

Bad examples (these read like an item, not an intro):
- Pain Points BAD:        "You're high-functioning on the outside, but crumbling inside."
- Desired Outcomes BAD:   "Imagine shifting from stuck to unstoppable."
- Guarantee BAD:          "You'll love it or your money back — no questions, no stress."

If a Headline Pattern is chosen (Recognition, Question, Observation, Emotional
Statement, Situation Based, etc.), APPLY IT WITHIN THE SECTION-INTRO PURPOSE.
Example: "Recognition" for Pain Points → "Does any of this sound familiar?",
NOT "You're overwhelmed and exhausted." Both are recognition, but only the
first works as a section introduction.$block$
  ),
  (
    'Headline Purpose — Persuasive',
$block$## HEADLINE PURPOSE — PERSUASIVE (MARKETING HEADLINE)

This headline is a persuasive marketing headline (Hero, Big Hook, main promise).

- Lead with the biggest promise, transformation, or hook.
- Emotion, curiosity, and desire are welcome.
- Be specific and vivid; avoid generic slogans.
- Speak directly to the reader ("you", "your").
- Keep it punchy — one line if possible.$block$
  ),
  (
    'Headline Purpose — CTA',
$block$## HEADLINE PURPOSE — CTA HEADLINE

This headline sits above a call-to-action and must push the reader to act.

- Frame the next step, not the offer itself.
- Use action-oriented, decisive language.
- Reinforce urgency or the transformation on the other side of the click.
- Keep it short; the button text does the heavy lifting.$block$
  ),
  (
    'Headline Purpose — Story',
$block$## HEADLINE PURPOSE — STORY HEADLINE

This headline introduces a narrative (founder story, origin, transformation).

- Signal a story is coming — intrigue over hard-sell.
- Hint at tension, turning point, or lesson.
- Personal, human tone. First-person is fine.
- Avoid feature/benefit language — that comes later.$block$
  ),
  (
    'Headline Purpose — Proof',
$block$## HEADLINE PURPOSE — PROOF HEADLINE

This headline introduces proof, credibility, or stats.

- Frame what the reader is about to see (results, numbers, testimonials).
- Confidence without hype; let the proof itself do the persuading.
- Short, factual, believable.
- Never overclaim or spoil the specifics that follow below.$block$
  )
) AS v(name, content)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_instruction_blocks b WHERE b.name = v.name
);

-- ============================================================
-- 3. Backfill copy_components with headline_purpose + linked block
-- ============================================================

-- Section Introduction components
UPDATE public.copy_components
SET headline_purpose = 'section_introduction',
    headline_instruction_block_id = (
      SELECT id FROM public.ai_instruction_blocks
      WHERE name = 'Headline Purpose — Section Introduction' LIMIT 1
    )
WHERE slug IN (
  'pain_points',
  'problem_amplifier',
  'desired_outcomes',
  'results_proof',
  'additional_results_proof',
  'core_outcomes',
  'program_deliverables',
  'process_mechanism',
  'guarantee',
  'faq',
  'decision_section',
  'credibility_stats',
  'authority_insight'
);

-- Persuasive headline components
UPDATE public.copy_components
SET headline_purpose = 'persuasive',
    headline_instruction_block_id = (
      SELECT id FROM public.ai_instruction_blocks
      WHERE name = 'Headline Purpose — Persuasive' LIMIT 1
    )
WHERE slug IN ('hero_section');

-- Story headline
UPDATE public.copy_components
SET headline_purpose = 'story',
    headline_instruction_block_id = (
      SELECT id FROM public.ai_instruction_blocks
      WHERE name = 'Headline Purpose — Story' LIMIT 1
    )
WHERE slug IN ('founder_story');

-- CTA headline
UPDATE public.copy_components
SET headline_purpose = 'cta',
    headline_instruction_block_id = (
      SELECT id FROM public.ai_instruction_blocks
      WHERE name = 'Headline Purpose — CTA' LIMIT 1
    )
WHERE slug IN ('final_cta');

-- ============================================================
-- 4. Backfill output_structure with a `role` on the main headline field
--    so the generator can detect headline fields without slug heuristics.
--    Only touches items whose key is exactly 'headline' or 'section_headline'
--    and that don't already have a role set.
-- ============================================================
UPDATE public.copy_components c
SET output_structure = sub.new_structure
FROM (
  SELECT
    id,
    jsonb_agg(
      CASE
        WHEN (elem->>'key') IN ('headline', 'section_headline', 'intro_headline')
             AND NOT (elem ? 'role')
        THEN elem || jsonb_build_object('role', 'section_headline')
        ELSE elem
      END
      ORDER BY ord
    ) AS new_structure
  FROM public.copy_components,
       LATERAL jsonb_array_elements(output_structure) WITH ORDINALITY AS t(elem, ord)
  GROUP BY id
) sub
WHERE c.id = sub.id
  AND jsonb_typeof(c.output_structure) = 'array';
