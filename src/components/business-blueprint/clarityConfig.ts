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

/**
 * Build the Customer Clarity config dynamically based on the workspace's business type.
 * This makes placeholders, examples, chips, helper text and AI prompts adapt to the user's business.
 */
export function getClarityConfig(businessTypeId?: BusinessTypeId | string | null): SubBlockConfig[] {
  const bt = getBusinessType(businessTypeId);
  const noun = bt.customerNoun;
  const nounSingular = bt.customerNounSingular;

  return [
    {
      id: "avatar",
      label: `Ideal ${nounSingular.charAt(0).toUpperCase() + nounSingular.slice(1)} Avatar`,
      icon: User,
      description: `Define exactly who your ideal ${nounSingular} is — the clearer, the better.`,
      insight: `The clearer your ${nounSingular} is, the better your copy, ads, funnels, and offers will perform. Vague audiences create weak marketing.`,
      fields: [
        {
          key: "avatar_who",
          label: `Who is your ideal ${nounSingular}?`,
          helper: "Be specific — situation, role, stage, urgency.",
          placeholder: `Example: ${bt.exampleAvatar}`,
          type: "textarea",
          fullWidth: true,
          rows: 3,
        },
        {
          key: "avatar_type",
          label: `What type of ${noun} are they?`,
          type: "chips-single",
          options: [
            { value: "coach", label: "Coach" },
            { value: "course-creator", label: "Course Creator" },
            { value: "agency", label: "Agency" },
            { value: "consultant", label: "Consultant" },
            { value: "ecommerce", label: "Ecommerce" },
            { value: "saas", label: "SaaS" },
            { value: "service", label: "Service Business" },
            { value: "local", label: "Local Business" },
            { value: "other", label: "Other" },
          ],
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
          placeholder: `Example: ${bt.id === "ecommerce" ? "Premium clean-skincare buyers in DACH" : bt.id === "local-business" ? "Homeowners in [your city] needing fast HVAC" : "Health & fitness coaching for busy professionals"}`,
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
          label: "Who is NOT a good fit?",
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
        { label: "Target Audience", value: bt.exampleAvatar },
        {
          label: "Niche",
          value:
            bt.id === "agency"
              ? "Performance marketing for B2B SaaS in the $50–250k MRR range."
              : bt.id === "ecommerce"
              ? "Premium clean-skincare for women 28–45 who value sustainable ingredients."
              : "High-ticket business coaching for service-based founders in Europe.",
        },
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
      insight: `${noun.charAt(0).toUpperCase() + noun.slice(1)} buy to escape pain. The deeper you understand their friction, the more your offer will feel like the obvious solution.`,
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
          placeholder:
            bt.id === "ecommerce"
              ? "Example: Carts abandoned, low repeat purchase, ad costs creeping up…"
              : bt.id === "agency"
              ? "Example: Cold leads ignoring DMs, deals stalling, churn after 2 months…"
              : "Example: Posting content with no engagement, chasing cold leads…",
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_blockers",
          label: "What is stopping them from getting results?",
          placeholder: "Example: No clear funnel, weak offer, no system for follow-up",
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_already_tried",
          label: "What have they already tried?",
          placeholder:
            bt.id === "ecommerce"
              ? "Example: New creatives, discounts, switching agencies, more SKUs…"
              : "Example: Cold DMs, paid ads, hiring a VA…",
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_why_failed",
          label: "Why didn't previous attempts work?",
          placeholder: "Example: No strategy, wrong audience, inconsistent execution",
          type: "textarea",
          rows: 3,
        },
        {
          key: "pain_consequences",
          label: "What are the consequences if they do nothing?",
          helper: "Both practical and emotional consequences.",
          placeholder: "Example: Stagnant revenue, burnout, losing belief in their business",
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
        {
          label: "Daily Frustration",
          value:
            bt.id === "ecommerce"
              ? "Spending more on ads each month while ROAS keeps dropping."
              : "Spending hours on content with little to no qualified leads coming in.",
        },
        {
          label: "Consequence",
          value: "Burnout, doubt, and slowly losing belief that their business model works.",
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
      insight: `${noun.charAt(0).toUpperCase() + noun.slice(1)} don't buy products — they buy a better version of themselves. Mapping desire is what makes your offer irresistible.`,
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
          placeholder:
            bt.id === "ecommerce"
              ? "Example: Steady daily orders, repeat customers, brand love on social…"
              : "Example: Waking up to booked calls and Stripe notifications…",
          type: "textarea",
          rows: 3,
        },
        {
          key: "desire_emotional_change",
          label: "What emotional change do they want?",
          placeholder: "Example: Confidence, calm, freedom, pride…",
          type: "textarea",
          rows: 3,
        },
        {
          key: "desire_lifestyle",
          label: "What freedom, identity, status, or lifestyle do they want?",
          placeholder: "Example: Recognized authority, time freedom, location independence",
          type: "textarea",
          rows: 3,
        },
        {
          key: "desire_why_badly",
          label: "Why do they want this so badly?",
          helper: "Dig deeper than surface-level goals.",
          placeholder: "Example: To prove to themselves they built something real and lasting",
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
        {
          label: "Dream Scenario",
          value:
            bt.id === "ecommerce"
              ? "A brand customers tag their friends in, with steady daily revenue and high repeat purchase."
              : "Running a lean, high-margin business with 3-day work weeks and full creative control.",
        },
        {
          label: "Why Badly",
          value: "To finally feel proud, in control, and free from the survival-mode hustle.",
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
          placeholder:
            bt.id === "ecommerce"
              ? "Example: Brand at 10k/mo with weak retention and rising ad costs…"
              : "Example: Stuck at €3k/month, working 60h weeks, no system…",
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
          placeholder:
            bt.id === "ecommerce"
              ? "Example: Revenue, AOV, repeat rate, brand recognition"
              : "Example: Revenue, client base, team, brand recognition",
          type: "textarea",
          rows: 3,
        },
        {
          key: "transformation_internal",
          label: "What changes internally?",
          placeholder: "Example: Confidence, identity, decision-making, peace of mind",
          type: "textarea",
          rows: 3,
        },
        {
          key: "transformation_possible",
          label: "What becomes possible once they reach the result?",
          placeholder: "Example: Hire a team, launch a second offer, take real time off",
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
        {
          label: "Point A",
          value:
            bt.id === "ecommerce"
              ? "Store at 10k/mo, weak email flow, repeat rate under 15%, anxious about Q4."
              : "Solo coach at €3k/month, juggling everything, no consistent lead flow, anxious about next month.",
        },
        { label: "Point B", value: bt.exampleTransformation },
        {
          label: "What Becomes Possible",
          value: "Hiring help, launching a second offer, taking real time off without revenue dropping.",
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
