// =============================================================================
// Builder chat (pure prompt assembly). Separate conversation per Builder
// session (`offer_builder_messages`), reusing the Coach's methodology, honesty
// rules, category briefs and field definitions. Advisory only: the chat never
// changes session decisions or offers — the user applies changes through the
// Builder's own controls.
// =============================================================================

import { COACH_METHODOLOGY } from "../coachMethodology.ts";
import { renderTierCoachBrief } from "../offerContext.ts";
import type { OfferTier } from "../blueprintRegistry.ts";
import { categoryWritableFields } from "./designMapping.ts";
import { builderBlueprintContext, confirmedFacts } from "./builderSession.ts";
import type { BuilderDecisions } from "./builderStages.ts";

export const BUILDER_CHAT_RULES = `# Irresistible Offer Builder — strategic advisor
You are the user's offer strategist inside the Irresistible Offer Builder (stages: Understand, Diagnose, Strengthen, Package, Final Offer Blueprint), applying the Value Equation (Dream Outcome, Perceived Likelihood, Speed to Value, Ease of Achievement).
- Act as an advisor: challenge, explain trade-offs, help the user decide. Do not just repeat the generated recommendations.
- You cannot change decisions, the draft or any saved offer. When a change makes sense, tell the user which Builder control to use (e.g. "choose your own alternative in Strengthen", "edit the value in Package") — never claim you changed anything.
- Honesty: never invent testimonials, results, case studies, revenue, conversion rates, competitor details, market prices or validation. Label assumptions. Prices are estimates.
- More deliverables do not equal more value. Never push bonuses or guarantees the business cannot genuinely back.
- Be concise (short paragraphs or bullets). Answer in the user's language.`;

export function buildBuilderChatSystem(tier: OfferTier): string {
  return [BUILDER_CHAT_RULES, COACH_METHODOLOGY, tier !== "core" ? renderTierCoachBrief(tier) : ""].filter(Boolean).join("\n\n");
}

const j = (v: unknown, n = 6000) => JSON.stringify(v ?? null).slice(0, n);

export function buildBuilderChatContext(input: {
  session: { stage: string; mode: string; intake?: any; understanding?: any; diagnosis?: any; decisions?: BuilderDecisions | null; draft_design?: any; status?: string };
  tier: OfferTier; design: Record<string, any> | null; blueprint: Record<string, any> | null; ecosystem: string | null;
}): string {
  const { session: s, tier } = input;
  const d = s.decisions ?? {};
  const parts = [
    `# Builder state (read-only)\nCategory: ${tier}. Mode: ${s.mode === "new" ? "new offer idea (no track record)" : "strengthening an existing offer"}. Current stage: ${s.stage}.`,
    s.intake?.idea ? `Offer idea: ${String(s.intake.idea).slice(0, 1500)}` : "",
    s.understanding ? `# Confirmed context\n${j(confirmedFacts(s.understanding))}` : "",
    s.diagnosis ? `# Diagnosis\nWeaknesses: ${j(s.diagnosis.weaknesses)}\nTop improvements: ${j(s.diagnosis.topImprovements)}\nScores: ${j(Object.fromEntries(Object.values(s.diagnosis.profile?.dimensions ?? {}).map((x: any) => [x.dimension, x.score])))}` : "",
    d.strengthen ? `# Strengthen items & user decisions\n${j(d.strengthen.items.map((i) => ({ weakness: i.weakness, options: i.options.map((o) => o.title), decision: i.decision })))}` : "",
    d.strengthen ? `Outstanding decisions: ${d.strengthen.items.filter((i) => !i.decision).map((i) => i.weakness).join(" | ") || "none"}` : "",
    s.draft_design ? `# Draft offer (proposed, not saved)\n${j(s.draft_design)}` : "",
    d.final ? `# Final assessment\n${j({ scores: Object.fromEntries(Object.values(d.final.profile.dimensions).map((x: any) => [x.dimension, x.score])), scoreChanges: d.final.scoreChanges, remainingAssumptions: d.final.remainingAssumptions })}` : "",
    input.design && s.mode === "existing" ? `# Saved offer design (current)\n${j(input.design)}` : "",
    `# Offer Design fields for this category\n${categoryWritableFields(tier).map((f) => `- ${f.label}`).join("\n")}`,
    input.blueprint ? `# Business Blueprint\n${j(builderBlueprintContext(input.blueprint), 5000)}` : "",
    input.ecosystem ? `# Other offers (read-only)\n${input.ecosystem}` : "",
  ];
  return parts.filter(Boolean).join("\n\n");
}
