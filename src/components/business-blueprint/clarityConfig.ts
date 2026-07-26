import { type LucideIcon } from "lucide-react";
import type { ClaritySubBlock, CustomerClarityData } from "./types";
import { getBusinessType, type BusinessTypeId } from "./businessTypes";
import { getFieldCopy } from "./clarityCopy";
import { getRegistrySubBlock, renderLabel, type LabelTokens } from "@shared/blueprintRegistry";
import { resolveIcon, toFieldDef } from "./registryUi";

export type FieldType =
  | "textarea"
  | "chips-single"
  | "chips-multi"
  | "tags"
  | "suggested-tags"
  | "bullet-list"
  | "colors";

export interface FieldDef {
  key: keyof CustomerClarityData;
  label: string;
  helper?: string;
  placeholder?: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  suggestions?: string[];
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
 * Build the Customer Clarity config from the Blueprint Registry (single source
 * of truth) and personalize labels, placeholders and helper text for the
 * workspace's business type. Never auto-fills user content.
 */
export function getClarityConfig(businessTypeId?: BusinessTypeId | string | null): SubBlockConfig[] {
  const bt = getBusinessType(businessTypeId);
  const noun = bt.customerNoun;
  const nounSingular = bt.customerNounSingular;
  const Noun = cap(noun);
  const NounSingular = cap(nounSingular);

  const tokens: LabelTokens = {
    noun,
    nounSingular,
    Noun,
    NounSingular,
    notFitSuffix: noun === "customers" ? "as a customer" : `to be your ${nounSingular}`,
  };

  /** Registry field → UI FieldDef, with niche-specific copy layered on top. */
  const fieldsOf = (subBlockId: ClaritySubBlock): FieldDef[] => {
    const sb = getRegistrySubBlock("customer_clarity", subBlockId);
    return (sb?.fields ?? []).map((field) => {
      const base = toFieldDef(field, tokens);
      const copy = getFieldCopy(bt.id, field.key as keyof CustomerClarityData);
      return {
        ...base,
        placeholder: copy.placeholder ?? base.placeholder,
        helper: copy.helper ?? base.helper,
      } as FieldDef;
    });
  };

  const meta = (subBlockId: ClaritySubBlock) => {
    const sb = getRegistrySubBlock("customer_clarity", subBlockId);
    return {
      label: renderLabel(sb?.label ?? subBlockId, tokens),
      icon: resolveIcon(sb?.iconKey ?? "Sparkles"),
      description: renderLabel(sb?.description ?? "", tokens),
      fields: fieldsOf(subBlockId),
    };
  };

  return [
    {
      id: "avatar",
      ...meta("avatar"),
      insight: `The clearer your ${nounSingular} is, the better your copy, ads, funnels, and offers will perform. Vague audiences create weak marketing.`,

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
      ...meta("pain"),
      insight: `${Noun} buy to escape pain. The deeper you understand their friction, the more your offer will feel like the obvious solution.`,

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
      ...meta("desire"),
      insight: `${Noun} don't buy products — they buy a better version of themselves. Mapping desire is what makes your offer irresistible.`,

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
      ...meta("transformation"),
      insight: `Your offer is a bridge from Point A to Point B. The clearer that bridge, the more obvious the value of working with you.`,

      coachQuestions: [
        "Where are they today, exactly?",
        "Where do they want to be in 12 months?",
        "What's the bridge between A and B?",
        "What stages or milestones make up the journey?",
        "What method or process do you guide them through?",
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
