import { User, AlertTriangle, Target, ArrowRightLeft, type LucideIcon } from "lucide-react";
import type { ClaritySubBlock, CustomerClarityData } from "./types";

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

export const CLARITY_CONFIG: SubBlockConfig[] = [
  {
    id: "avatar",
    label: "Ideal Customer Avatar",
    icon: User,
    description: "Define who your ideal customer is in a practical marketing sense.",
    insight:
      "The clearer your customer is, the better your copy, ads, funnels, and offers will perform. Vague audiences create weak marketing.",
    fields: [
      {
        key: "avatar_who",
        label: "Who is your ideal customer?",
        helper: "Be specific — name, role, situation.",
        placeholder: "Example: Solo fitness coaches stuck at €3k/month who need predictable leads",
        type: "textarea",
        fullWidth: true,
        rows: 3,
      },
      {
        key: "avatar_type",
        label: "What type of person or business are they?",
        type: "chips-single",
        options: [
          { value: "coach", label: "Coach" },
          { value: "course-creator", label: "Course Creator" },
          { value: "agency", label: "Agency" },
          { value: "consultant", label: "Consultant" },
          { value: "ecommerce", label: "Ecommerce" },
          { value: "saas", label: "SaaS" },
          { value: "service", label: "Service Business" },
          { value: "other", label: "Other" },
        ],
      },
      {
        key: "avatar_stage",
        label: "What stage are they at right now?",
        type: "chips-single",
        options: [
          { value: "beginner", label: "Beginner" },
          { value: "growing", label: "Growing" },
          { value: "established", label: "Established" },
          { value: "scaling", label: "Scaling" },
        ],
      },
      {
        key: "avatar_niche",
        label: "What niche or market are they in?",
        placeholder: "Example: Health & fitness coaching for busy professionals",
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
        placeholder: "Example: People looking for overnight success or unwilling to implement",
        type: "textarea",
        fullWidth: true,
        rows: 2,
      },
    ],
    coachQuestions: [
      "Who do you most enjoy helping?",
      "Who gets the fastest results with you?",
      "What level are they currently at?",
      "What problem do they urgently want solved?",
      "Who is NOT a fit for what you offer?",
    ],
    examples: [
      {
        label: "Target Audience",
        value:
          "Online coaches doing €5k–15k/month who need a scalable client acquisition system.",
      },
      {
        label: "Niche",
        value: "High-ticket business coaching for service-based founders in Europe.",
      },
      {
        label: "Not a Good Fit",
        value: "People looking for overnight success or unwilling to implement.",
      },
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
    description: "Capture what your customer is struggling with right now.",
    insight:
      "People buy to escape pain. The deeper you understand their friction, the more your offer will feel like the obvious solution.",
    fields: [
      {
        key: "pain_main_problem",
        label: "What is the main problem they are dealing with?",
        placeholder: "Example: They can't generate predictable leads and rely on referrals",
        type: "textarea",
        fullWidth: true,
        rows: 2,
      },
      {
        key: "pain_daily_frustrations",
        label: "What frustrations do they experience daily?",
        placeholder: "Example: Posting content with no engagement, chasing cold leads…",
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
        placeholder: "Example: Cold DMs, paid ads, hiring a VA…",
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
      "What do clients complain about most?",
      "What keeps them up at night?",
      "What have they tried that didn't work?",
      "What's the cost of staying stuck?",
      "What emotional toll does this take?",
    ],
    examples: [
      {
        label: "Main Problem",
        value: "Inconsistent revenue caused by lack of a predictable lead-generation system.",
      },
      {
        label: "Daily Frustration",
        value: "Spending hours on content with little to no qualified leads coming in.",
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
    insight:
      "People don't buy products — they buy a better version of themselves. Mapping desire is what makes your offer irresistible.",
    fields: [
      {
        key: "desire_main_result",
        label: "What result do they want most?",
        placeholder: "Example: Sign 5 new clients per month on autopilot",
        type: "textarea",
        fullWidth: true,
        rows: 2,
      },
      {
        key: "desire_dream_scenario",
        label: "What does their dream scenario look like?",
        placeholder: "Example: Waking up to booked calls and Stripe notifications…",
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
      {
        label: "Main Result",
        value: "A consistent pipeline of 10–20 qualified calls per month without manual outreach.",
      },
      {
        label: "Dream Scenario",
        value: "Running a lean, high-margin business with 3-day work weeks and full creative control.",
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
    insight:
      "Your offer is a bridge from Point A to Point B. The clearer that bridge, the more obvious the value of working with you.",
    fields: [
      {
        key: "transformation_point_a",
        label: "Point A — current state",
        helper: "Their pain, situation, and identity today.",
        placeholder: "Example: Stuck at €3k/month, working 60h weeks, no system…",
        type: "textarea",
        rows: 4,
      },
      {
        key: "transformation_point_b",
        label: "Point B — desired state",
        helper: "Their outcome, situation, and new identity.",
        placeholder: "Example: €15k/month, 4-day work week, recognized authority…",
        type: "textarea",
        rows: 4,
      },
      {
        key: "transformation_external",
        label: "What changes externally?",
        placeholder: "Example: Revenue, client base, team, brand recognition",
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
        value: "Solo coach at €3k/month, juggling everything, no consistent lead flow, anxious about next month.",
      },
      {
        label: "Point B",
        value: "Coach at €15k/month with a system that books 15+ calls monthly, calm, in demand, choosing clients.",
      },
      {
        label: "What Becomes Possible",
        value: "Hiring help, launching a group program, taking real time off without revenue dropping.",
      },
    ],
    feedback: [
      { threshold: 50, message: "Good baseline. Keep contrasting A vs B — sharper contrast sells." },
      { threshold: 80, message: "Strong transformation arc. This makes your offer feel inevitable." },
      { threshold: 100, message: "Crystal-clear journey. Your sales page practically writes itself." },
    ],
  },
];

export const getConfig = (id: ClaritySubBlock): SubBlockConfig =>
  CLARITY_CONFIG.find((c) => c.id === id)!;

export function getFeedbackMessage(config: SubBlockConfig, progress: number): string | null {
  const matching = config.feedback.filter((f) => progress >= f.threshold);
  return matching.length ? matching[matching.length - 1].message : null;
}
