import { User, AlertTriangle, Target, ArrowRightLeft, type LucideIcon } from "lucide-react";
import type { ClaritySubBlock, CustomerClarityData } from "./types";
import { getBusinessType, type BusinessTypeId } from "./businessTypes";
import { getFieldCopy } from "./clarityCopy";

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
 * Personalizes labels, placeholders, helper text, chips, examples and AI prompts
 * for ALL 22 fields across all 4 sub-blocks. Never auto-fills user content.
 */
export function getClarityConfig(businessTypeId?: BusinessTypeId | string | null): SubBlockConfig[] {
  const bt = getBusinessType(businessTypeId);
  const noun = bt.customerNoun;
  const nounSingular = bt.customerNounSingular;
  const Noun = cap(noun);
  const NounSingular = cap(nounSingular);
  const typeLabel = bt.label.toLowerCase();

  /** Build a field definition merged with niche-specific copy. */
  const f = (
    base: Omit<FieldDef, "placeholder" | "helper"> & { placeholder?: string; helper?: string },
  ): FieldDef => {
    const copy = getFieldCopy(bt.id, base.key);
    return {
      ...base,
      placeholder: copy.placeholder ?? base.placeholder,
      helper: copy.helper ?? base.helper,
    };
  };

  return [
    {
      id: "avatar",
      label: `Ideal ${NounSingular} Avatar`,
      icon: User,
      description: `Define exactly who your ideal ${nounSingular} is — the clearer, the better.`,
      insight: `The clearer your ${nounSingular} is, the better your copy, ads, funnels, and offers will perform. Vague audiences create weak marketing.`,
      fields: [
        f({ key: "avatar_who", label: `Who is your ideal ${nounSingular}?`, type: "textarea", fullWidth: true, rows: 3 }),
        f({
          key: "avatar_type",
          label: `What kind of ${typeLabel} business serves them best?`,
          type: "chips-single",
          options: bt.nicheOptions,
        }),
        f({ key: "avatar_stage", label: "What stage are they at right now?", type: "chips-single", options: bt.stageOptions }),
        f({ key: "avatar_niche", label: "What niche or market are they in?", type: "textarea", rows: 2 }),
        f({ key: "avatar_traits", label: "Traits or mindset that define them", type: "tags", fullWidth: true }),
        f({
          key: "avatar_not_fit",
          label: `Who is NOT a good fit ${noun === "customers" ? "as a customer" : `to be your ${nounSingular}`}?`,
          type: "textarea",
          fullWidth: true,
          rows: 2,
        }),
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
        f({ key: "pain_main_problem", label: "What is the main problem they are dealing with?", type: "textarea", fullWidth: true, rows: 2 }),
        f({ key: "pain_daily_frustrations", label: "What frustrations do they experience daily?", type: "textarea", rows: 3 }),
        f({ key: "pain_blockers", label: "What is stopping them from getting results?", type: "textarea", rows: 3 }),
        f({ key: "pain_already_tried", label: "What have they already tried?", type: "textarea", rows: 3 }),
        f({ key: "pain_why_failed", label: "Why didn't previous attempts work?", type: "textarea", rows: 3 }),
        f({ key: "pain_consequences", label: "What are the consequences if they do nothing?", type: "textarea", fullWidth: true, rows: 2 }),
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
        { label: "Consequence", value: getFieldCopy(bt.id, "pain_consequences").placeholder?.replace(/^Example:\s*/, "") || bt.examplePain },
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
      description: `Map what your ${noun} want, externally and internally.`,
      insight: `${Noun} don't buy products — they buy a better version of themselves. Mapping desire is what makes your offer irresistible.`,
      fields: [
        f({ key: "desire_main_result", label: "What result do they want most?", type: "textarea", fullWidth: true, rows: 2 }),
        f({ key: "desire_dream_scenario", label: "What does their dream scenario look like?", type: "textarea", rows: 3 }),
        f({ key: "desire_emotional_change", label: "What emotional change do they want?", type: "textarea", rows: 3 }),
        f({ key: "desire_lifestyle", label: "What freedom, identity, status, or lifestyle do they want?", type: "textarea", rows: 3 }),
        f({ key: "desire_why_badly", label: "Why do they want this so badly?", type: "textarea", fullWidth: true, rows: 2 }),
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
        { label: "Why Badly", value: getFieldCopy(bt.id, "desire_why_badly").placeholder?.replace(/^Example:\s*/, "") || bt.exampleResult },
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
        f({ key: "transformation_point_a", label: "Point A — current state", type: "textarea", rows: 4 }),
        f({ key: "transformation_point_b", label: "Point B — desired state", type: "textarea", rows: 4 }),
        f({ key: "transformation_external", label: "What changes externally?", type: "textarea", rows: 3 }),
        f({ key: "transformation_internal", label: "What changes internally?", type: "textarea", rows: 3 }),
        f({ key: "transformation_possible", label: "What becomes possible once they reach the result?", type: "textarea", fullWidth: true, rows: 2 }),
      ],
      coachQuestions: [
        "Where are they today, exactly?",
        "Where do they want to be in 12 months?",
        "What external changes will happen?",
        "What internal shifts will they experience?",
        "What new doors will this open for them?",
      ],
      examples: [
        { label: "Point A", value: getFieldCopy(bt.id, "transformation_point_a").placeholder?.replace(/^Example:\s*/, "") || bt.examplePointA },
        { label: "Point B", value: bt.exampleTransformation },
        { label: "What Becomes Possible", value: getFieldCopy(bt.id, "transformation_possible").placeholder?.replace(/^Example:\s*/, "") || bt.exampleTransformation },
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
