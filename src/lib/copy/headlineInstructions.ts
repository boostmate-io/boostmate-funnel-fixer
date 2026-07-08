// Central helper that adds "Section Introduction" guidance to Copy Component
// AI generations for components whose main headline is NOT a persuasive
// marketing headline but an introduction to the list/content below it.
//
// Two headline purposes exist across the Copy Writer:
//   1. Section Introduction — introduces the content that follows.
//      Should transition, prep the reader, and never become the first item.
//   2. Persuasive Headline  — emotional / curiosity-driven marketing copy
//      (Hero, Big Hook, Story, main CTA). Keep as-is.
//
// Components using SECTION INTRODUCTION headlines:
export const SECTION_INTRO_COMPONENTS = new Set<string>([
  "pain-points",
  "problem-amplifier",
  "desired-outcomes",
  "results-proof",
  "additional-results-proof",
  "core-outcomes",
  "program-deliverables",
  "process-mechanism",
  "risk-reversal-guarantee",
  "faq-objections",
  "urgency-exclusivity-decision",
  "credibility-stats",
  "authority-context-insight",
]);

// Keys in outputs that represent the section's INTRO headline (not
// item-level titles, sub-CTAs, etc.). Regenerating any of these should
// also receive the section-intro guidance.
export const SECTION_INTRO_HEADLINE_KEYS = new Set<string>([
  "headline",
  "section_headline",
  "intro_headline",
]);

const SECTION_INTRO_BLOCK = `
## HEADLINE PURPOSE — SECTION INTRODUCTION (CRITICAL)

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

Good examples of section-intro headlines by section type:
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
first works as a section introduction.
`.trim();

/**
 * Wraps the user/component instructions with an extra "section introduction"
 * guidance block when the component's main headline should behave as a
 * section intro rather than a persuasive headline.
 *
 * @param componentSlug          Slug of the copy component being generated.
 * @param componentInstructions  The component-level instructions (already user-provided).
 * @param options.focusFieldKey  If a single field is being regenerated, pass its key so we
 *                               only inject the intro guidance when the field itself is a
 *                               section-intro headline.
 */
export function buildCopyExtraInstructions(
  componentSlug: string | undefined,
  componentInstructions: string | undefined,
  options: { focusFieldKey?: string } = {},
): string | undefined {
  const base = componentInstructions?.trim() || "";
  const isSectionIntroComponent = !!componentSlug && SECTION_INTRO_COMPONENTS.has(componentSlug);

  // On per-field regeneration, only add the block when we're regenerating a
  // headline-type field. Otherwise, adding it to unrelated fields is noise.
  if (options.focusFieldKey !== undefined) {
    const isHeadlineField = SECTION_INTRO_HEADLINE_KEYS.has(options.focusFieldKey);
    if (!isSectionIntroComponent || !isHeadlineField) {
      return base || undefined;
    }
  } else if (!isSectionIntroComponent) {
    return base || undefined;
  }

  return base ? `${base}\n\n${SECTION_INTRO_BLOCK}` : SECTION_INTRO_BLOCK;
}
