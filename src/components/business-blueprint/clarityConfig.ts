import { User, AlertTriangle, Target, ArrowRightLeft, type LucideIcon } from "lucide-react";
import type { ClaritySubBlock, CustomerClarityData } from "./types";
import { getBusinessType, type BusinessTypeId } from "./businessTypes";

export type FieldType = "textarea" | "chips-single" | "chips-multi" | "tags";

export interface FieldDef {
  key: keyof CustomerClarityData;
  label: string;
  helper?: string;
  placeholder?: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  fullWidth?: boolean;
  rows?: number;
}

export interface SubBlockConfig {
  id: ClaritySubBlock;
  label: string;
  icon: LucideIcon;
  description: string;
  insight: string;
  fields: FieldDef[];
  coachQuestions: string[];
  examples: { label: string; value: string }[];
  feedback: { threshold: number; message: string }[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pickAvatar = (arr: string[], i: number) => arr[i % arr.length] || arr[0];

/**
 * Build the Customer Clarity config dynamically based on the workspace's business type.
 * This personalizes labels, placeholders, helper text, chips and AI prompts only —
 * it never auto-fills user content.
 */
export function getClarityConfig(businessTypeId?: BusinessTypeId | string | null): SubBlockConfig[] {
  const bt = getBusinessType(businessTypeId);
  const noun = bt.customerNoun;
  const nounSingular = bt.customerNounSingular;
  const Noun = cap(noun);
  const NounSingular = cap(nounSingular);
  const typeLabel = bt.label.toLowerCase();

  return [
    {
      id: "avatar",
      label: `Ideal ${NounSingular} Avatar`,
      icon: User,
      description: `Define exactly who your ideal ${nounSingular} is — the clearer, the better.`,
      insight: `The clearer your ${nounSingular} is, the better your copy, ads, funnels, and offers will perform. Vague audiences create weak marketing.`,
      fields: [
        {
          key: "avatar_who",
          label: `Who is your ideal ${nounSingular}?`,
          helper: "Be specific — situation, identity, stage, urgency.",
          placeholder: `Example: ${pickAvatar(bt.avatarExamples, 0)}`,
          type: "textarea",
          fullWidth: true,
          rows: 3,
        },
        {
          key: "avatar_type",
          label: `What kind of ${typeLabel} business serves them best?`,
          helper: `Pick the closest sub-niche of ${typeLabel} you operate in.`,
          type: "chips-single",
          options: bt.nicheOptions,
        },
        {
          key: "avatar_stage",
          label: "What stage are they at right now?",
          type: "chips-single",
          options: bt.stageOptions,
        },
        {
          key: "avatar_niche",
          label: "What niche or market are they in?",
          placeholder: `Example: ${bt.exampleNicheMarket}`,
          type: "textarea",
          rows: 2,
        },
        {
          key: "avatar_traits",
          label: "Traits or mindset that define them",
          helper: "Add tags — press Enter or comma.",
          placeholder: "Type a trait and press Enter…",
          type: "tags",
          fullWidth: true,
        },
        {
          key: "avatar_not_fit",
          label: `Who is NOT a good fit ${noun === "customers" ? "as a customer" : `to be your ${nounSingular}`}?`,
          helper: "Knowing who to exclude sharpens your messaging.",
          placeholder: `Example: ${bt.exampleNotFit}`,
          type: "textarea",
          fullWidth: true,
          rows: 2,
        },
      ],
      coachQuestions: [
        `Who do you most enjoy serving as ${noun}?`,
        `Which ${noun} get the fastest results with you?`,
        "What level or stage are they currently at?",
        "What problem do they urgently want solved?",
        `Which ${noun} are NOT a fit for what you offer?`,
      ],
      examples: [
        { label: `Target ${Noun}`, value: pickAvatar(bt.avatarExamples, 0) },
        { label: "Alternative Avatar", value: pickAvatar(bt.avatarExamples, 1) },
        { label: "Niche", value: bt.exampleNicheMarket },
        { label: "Not a Good Fit", value: bt.exampleNotFit },
      ],
      feedback: [
        { threshold: 50, message: "Good start — keep adding specificity to sharpen your audience." },
        { threshold: 80, message: "Strong niche definition. This will improve ad targeting and copy relevance." },
        { threshold: 100, message: "Excellent clarity. Your messaging will feel laser-targeted." },
      ],
    },
    {
      id: "pain",
      label: "Pain & Friction",
      icon: AlertTriangle,
      description: `Capture exactly what your ${nounSingular} is struggling with right now.`,
      insight: `${Noun} buy to escape pain. The deeper you understand their friction, the more your offer will feel like the obvious solution.`,
      fields: [
        {
          key: "pain_main_problem",
          label: "What is the main problem they are dealing with?",
          placeholder: `Example: ${bt.examplePain}`,
          type: "textarea",
          fullWidth: true,
          rows: 2,
        },
        {
          key: "pain_daily_frustrations",
          label: "What frustrations do they experience daily?",
          placeholder: `Example: ${bt.exampleDailyFrustration}`,
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_blockers",
          label: "What is stopping them from getting results?",
          placeholder: "Example: No clear path, weak offer, no support system, lack of accountability.",
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_already_tried",
          label: "What have they already tried?",
          placeholder: `Example: ${
            bt.id === "ecommerce"
              ? "New creatives, discounts, switching agencies, more SKUs"
              : bt.id === "coach"
              ? "Free YouTube content, generic programs, willpower-based plans"
              : bt.id === "agency"
              ? "Hiring freelancers, switching tools, multiple lead gen tactics"
              : "Different methods, courses, or providers without lasting results"
          }`,
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_why_failed",
          label: "Why didn't previous attempts work?",
          placeholder: "Example: No personalized strategy, wrong fit, inconsistent execution.",
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_consequences",
          label: "What are the consequences if they do nothing?",
          helper: "Both practical and emotional consequences.",
          placeholder:
            bt.id === "coach"
              ? "Example: Staying stuck in the same patterns, losing confidence, drifting from who they want to be."
              : "Example: Stagnant revenue, burnout, losing belief in their business.",
          type: "textarea",
          fullWidth: true,
          rows: 2,
        },
      ],
      coachQuestions: [
        `What do your ${noun} complain about most?`,
        "What keeps them up at night?",
        "What have they tried that didn't work?",
        "What's the cost of staying stuck?",
        "What emotional toll does this take?",
      ],
      examples: [
        { label: "Main Problem", value: bt.examplePain },
        { label: "Daily Frustration", value: bt.exampleDailyFrustration },
        {
          label: "Consequence",
          value:
            bt.id === "coach"
              ? "Years pass without the breakthrough they crave — and self-doubt starts to feel permanent."
              : "Burnout, doubt, and slowly losing belief that their business model works.",
        },
      ],
      feedback: [
        { threshold: 50, message: "Solid pain mapping — keep going to uncover the deeper drivers." },
        { threshold: 80, message: "Great depth. This pain will fuel powerful hooks and headlines." },
        { threshold: 100, message: "World-class pain insight. Your copy will hit hard." },
      ],
    },
    {
      id: "desire",
      label: "Desire & Goals",
      icon: Target,
      description: "Map what they want, externally and internally.",
      insight: `${Noun} don't buy products — they buy a better version of themselves. Mapping desire is what makes your offer irresistible.`,
      fields: [
        {
          key: "desire_main_result",
          label: "What result do they want most?",
          placeholder: `Example: ${bt.exampleResult}`,
          type: "textarea",
          fullWidth: true,
          rows: 2,
        },
        {
          key: "desire_dream_scenario",
          label: "What does their dream scenario look like?",
          placeholder: `Example: ${bt.exampleDreamScenario}`,
          type: "textarea",
          rows: 3,
        },
        {
          key: "desire_emotional_change",
          label: "What emotional change do they want?",
          placeholder:
            bt.id === "coach"
              ? "Example: Confidence, peace, self-trust, pride, freedom from old patterns."
              : "Example: Confidence, calm, pride, freedom, certainty.",
          type: "textarea",
          rows: 3,
        },
        {
          key: "desire_lifestyle",
          label: "What freedom, identity, status, or lifestyle do they want?",
          placeholder:
            bt.id === "coach"
              ? "Example: Becoming the strong, confident version of themselves they always knew was possible."
              : "Example: Recognized authority, time freedom, location independence.",
          type: "textarea",
          rows: 3,
        },
        {
          key: "desire_why_badly",
          label: "Why do they want this so badly?",
          helper: "Dig deeper than surface-level goals.",
          placeholder:
            bt.id === "coach"
              ? "Example: To finally feel proud of who they're becoming and stop carrying old wounds."
              : "Example: To prove to themselves they built something real and lasting.",
          type: "textarea",
          fullWidth: true,
          rows: 2,
        },
      ],
      coachQuestions: [
        "What outcome do they want most?",
        "What does success look like in 12 months?",
        "What identity do they want to step into?",
        "What would they brag about to friends?",
        "Why does this matter to them deeply?",
      ],
      examples: [
        { label: "Main Result", value: bt.exampleResult },
        { label: "Dream Scenario", value: bt.exampleDreamScenario },
        {
          label: "Why Badly",
          value:
            bt.id === "coach"
              ? "To finally feel free, proud, and at peace with who they are becoming."
              : "To finally feel proud, in control, and free from the survival-mode hustle.",
        },
      ],
      feedback: [
        { threshold: 50, message: "Nice — start layering in the emotional why." },
        { threshold: 80, message: "Powerful desire mapping. This is gold for sales pages." },
        { threshold: 100, message: "Magnetic. Your offer will feel like the obvious next step." },
      ],
    },
    {
      id: "transformation",
      label: "Transformation",
      icon: ArrowRightLeft,
      description: "Define the journey from current state to desired state.",
      insight: `Your offer is a bridge from Point A to Point B. The clearer that bridge, the more obvious the value of working with you.`,
      fields: [
        {
          key: "transformation_point_a",
          label: "Point A — current state",
          helper: "Their pain, situation, and identity today.",
          placeholder: `Example: ${bt.examplePointA}`,
          type: "textarea",
          rows: 4,
        },
        {
          key: "transformation_point_b",
          label: "Point B — desired state",
          helper: "Their outcome, situation, and new identity.",
          placeholder: `Example: ${bt.exampleTransformation}`,
          type: "textarea",
          rows: 4,
        },
        {
          key: "transformation_external",
          label: "What changes externally?",
          placeholder: `Example: ${bt.exampleExternal}`,
          type: "textarea",
          rows: 3,
        },
        {
          key: "transformation_internal",
          label: "What changes internally?",
          placeholder:
            bt.id === "coach"
              ? "Example: Confidence, self-trust, sense of identity, peace of mind."
              : "Example: Confidence, identity, decision-making, peace of mind.",
          type: "textarea",
          rows: 3,
        },
        {
          key: "transformation_possible",
          label: "What becomes possible once they reach the result?",
          placeholder:
            bt.id === "coach"
              ? "Example: Healthier relationships, deeper purpose, the courage to take new leaps."
              : "Example: Hire a team, launch a second offer, take real time off.",
          type: "textarea",
          fullWidth: true,
          rows: 2,
        },
      ],
      coachQuestions: [
        "Where are they today, exactly?",
        "Where do they want to be in 12 months?",
        "What external changes will happen?",
        "What internal shifts will they experience?",
        "What new doors will this open for them?",
      ],
      examples: [
        { label: "Point A", value: bt.examplePointA },
        { label: "Point B", value: bt.exampleTransformation },
        {
          label: "What Becomes Possible",
          value:
            bt.id === "coach"
              ? "Stepping into a new identity — calm, confident, in alignment with who they truly want to be."
              : "Hiring help, launching a second offer, taking real time off without revenue dropping.",
        },
      ],
      feedback: [
        { threshold: 50, message: "Good baseline. Keep contrasting A vs B — sharper contrast sells." },
        { threshold: 80, message: "Strong transformation arc. This makes your offer feel inevitable." },
        { threshold: 100, message: "Crystal-clear journey. Your sales page practically writes itself." },
      ],
    },
  ];
}

export function getConfigFor(
  id: ClaritySubBlock,
  businessTypeId?: BusinessTypeId | string | null
): SubBlockConfig {
  return getClarityConfig(businessTypeId).find((c) => c.id === id)!;
}

export function getFeedbackMessage(config: SubBlockConfig, progress: number): string | null {
  const matching = config.feedback.filter((f) => progress >= f.threshold);
  return matching.length ? matching[matching.length - 1].message : null;
}

// Backwards compatibility (default coach config)
export const CLARITY_CONFIG = getClarityConfig("coach");
export const getConfig = (id: ClaritySubBlock) => getConfigFor(id, "coach");
