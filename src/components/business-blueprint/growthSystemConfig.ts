import { Megaphone, Workflow, Target, Heart, TrendingUp, type LucideIcon } from "lucide-react";
import type { GrowthSystemData, GrowthSubBlock } from "./growthSystemTypes";
import { getBusinessType, type BusinessTypeId } from "./businessTypes";
import { getGrowthFieldCopy } from "./growthSystemCopy";
import type { FieldType } from "./clarityConfig";

export interface GrowthFieldDef {
  key: keyof GrowthSystemData;
  label: string;
  helper?: string;
  placeholder?: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  fullWidth?: boolean;
  rows?: number;
}

export interface GrowthSubBlockConfig {
  id: GrowthSubBlock;
  label: string;
  icon: LucideIcon;
  description: string;
  insight: string;
  fields: GrowthFieldDef[];
  coachQuestions: string[];
  feedback: { threshold: number; message: string }[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TRAFFIC_SOURCE_OPTIONS = [
  { value: "organic-social", label: "Organic Social" },
  { value: "paid-ads", label: "Paid Ads" },
  { value: "youtube", label: "YouTube" },
  { value: "seo", label: "SEO" },
  { value: "referrals", label: "Referrals" },
  { value: "partnerships", label: "Partnerships" },
  { value: "cold-outreach", label: "Cold Outreach" },
  { value: "affiliates", label: "Affiliates" },
  { value: "other", label: "Other" },
];

const CONVERSION_MECHANISM_OPTIONS = [
  { value: "checkout-page", label: "Checkout Page" },
  { value: "sales-calls", label: "Sales Calls" },
  { value: "application-form", label: "Application Form" },
  { value: "dm-sales", label: "DM Sales" },
  { value: "webinar-close", label: "Webinar Close" },
  { value: "vsl-close", label: "VSL Close" },
  { value: "other", label: "Other" },
];

export function getGrowthSystemConfig(
  businessTypeId?: BusinessTypeId | string | null,
): GrowthSubBlockConfig[] {
  const bt = getBusinessType(businessTypeId);
  const noun = bt.customerNoun;
  const Noun = cap(noun);

  const f = (base: GrowthFieldDef): GrowthFieldDef => {
    const copy = getGrowthFieldCopy(bt.id, base.key);
    return {
      ...base,
      placeholder: copy.placeholder ?? base.placeholder,
      helper: copy.helper ?? base.helper,
    };
  };

  return [
    {
      id: "traffic",
      label: "Traffic Engine",
      icon: Megaphone,
      description: `How strangers first discover your business and enter your ecosystem.`,
      insight: `Without consistent attention, nothing else matters. ${Noun} can't buy from you if they never see you.`,
      fields: [
        f({ key: "traffic_primary_source", label: "Primary Traffic Source", helper: "Your #1 channel for new audience today.", type: "chips-single", options: TRAFFIC_SOURCE_OPTIONS, fullWidth: true }),
        f({ key: "traffic_secondary_source", label: "Secondary Traffic Source", helper: "Optional supporting channel.", type: "chips-single", options: TRAFFIC_SOURCE_OPTIONS, fullWidth: true }),
        f({ key: "traffic_best_performing", label: "Current Best Performing Source", helper: "Which channel converts best right now.", type: "textarea", rows: 3 }),
        f({ key: "traffic_bottleneck", label: "Biggest Traffic Bottleneck", helper: "Low reach, poor lead quality, expensive traffic, inconsistent volume, or no system at all.", type: "textarea", rows: 3 }),
      ],
      coachQuestions: [
        "Where does your best customer most often find you today?",
        "Which channel has the lowest cost per qualified lead?",
        "What channel keeps surprising you with quality leads?",
        "Where is the biggest leak in your traffic system?",
        "If you could only use one channel for 90 days, which would you pick?",
      ],
      feedback: [
        { threshold: 50, message: "Good start — keep clarifying where attention enters your business." },
        { threshold: 80, message: "Strong traffic clarity. You know where your audience comes from." },
        { threshold: 100, message: "World-class traffic engine awareness. Ready to scale what works." },
      ],
    },
    {
      id: "funnels",
      label: "Funnel Ecosystem",
      icon: Workflow,
      description: `Map each offer to the funnel that converts ${noun} into buyers.`,
      insight: `Each offer needs its own funnel. Without it, traffic leaks and ${noun} never see what you actually sell.`,
      fields: [
        f({ key: "funnel_free_offer", label: "Free Offer Funnel", helper: "Funnel that captures emails / leads via your free offer.", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "funnel_low_ticket", label: "Low Ticket Funnel", helper: "Funnel that turns leads into first-time buyers.", type: "textarea", rows: 3 }),
        f({ key: "funnel_core_offer", label: "Core Offer Funnel", helper: "The main funnel driving your flagship offer.", type: "textarea", rows: 3 }),
        f({ key: "funnel_application", label: "Application Funnel", helper: "Optional — qualifying funnel for high-ticket offers.", type: "textarea", rows: 3 }),
        f({ key: "funnel_webinar_vsl", label: "Webinar / VSL Funnel", helper: "Optional — long-form education funnel that converts cold traffic.", type: "textarea", rows: 3 }),
        f({ key: "funnel_missing_opportunities", label: "Missing Funnel Opportunities", helper: "Funnels you know you need but haven't built yet.", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "Which offer in your value ladder is missing its funnel?",
        "Where do you currently lose the most leads in your funnel chain?",
        "Could a webinar or VSL warm up cold traffic faster?",
        "Do you have a step-up funnel from free → paid?",
        "Which funnel, if built, would unlock the biggest revenue jump?",
      ],
      feedback: [
        { threshold: 50, message: "Solid mapping. Keep filling in the missing funnels." },
        { threshold: 80, message: "Strong ecosystem. Your offers each have a path to buyers." },
        { threshold: 100, message: "Complete funnel ecosystem — every offer has a clear conversion path." },
      ],
    },
    {
      id: "conversion",
      label: "Conversion System",
      icon: Target,
      description: `How leads actually become paying ${noun} in your business.`,
      insight: `A great offer with a weak conversion system still loses money. The close mechanism decides revenue.`,
      fields: [
        f({ key: "conversion_primary_mechanism", label: "Primary Conversion Mechanism", helper: "How leads cross from interested to paying.", type: "chips-single", options: CONVERSION_MECHANISM_OPTIONS, fullWidth: true }),
        f({ key: "conversion_followup_process", label: "Follow-up Process", helper: "Your structured follow-up sequence after first contact.", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "conversion_sales_cycle", label: "Sales Cycle Length", helper: "Same day / 7 days / 30 days etc.", type: "textarea", rows: 2 }),
        f({ key: "conversion_bottleneck", label: "Biggest Conversion Bottleneck", helper: "No follow-up, poor close rate, weak sales process, unqualified leads, etc.", type: "textarea", rows: 3 }),
      ],
      coachQuestions: [
        "What's the #1 reason qualified leads don't buy?",
        "Where do prospects go silent in your sales process?",
        "How many follow-up touches do you actually make?",
        "Could a structured close framework lift conversions?",
        "What's your true close rate on qualified leads?",
      ],
      feedback: [
        { threshold: 50, message: "Conversion system taking shape — keep tightening the close." },
        { threshold: 80, message: "Strong conversion mechanics. Revenue is becoming predictable." },
        { threshold: 100, message: "Excellent. You've engineered a conversion system that compounds." },
      ],
    },
    {
      id: "nurture",
      label: "Nurture System",
      icon: Heart,
      description: `Build trust over time so ${noun} are ready when they need you.`,
      insight: `Most ${noun} don't buy on first contact. Strong nurture compounds your traffic by capturing demand at every stage.`,
      fields: [
        f({ key: "nurture_email", label: "Email Nurture System", helper: "Your email rhythm + value delivered to warm leads.", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "nurture_retargeting", label: "Retargeting System", helper: "Paid retargeting across the channels your audience uses.", type: "textarea", rows: 3 }),
        f({ key: "nurture_organic_content", label: "Organic Content Nurture", helper: "Your content cadence and core themes that build trust.", type: "textarea", rows: 3 }),
        f({ key: "nurture_dm_followup", label: "DM Follow-Up", helper: "Personal DM follow-up with engaged audience members.", type: "textarea", rows: 3 }),
        f({ key: "nurture_community", label: "Community Nurture", helper: "Optional — free or paid community space where trust is built.", type: "textarea", rows: 3 }),
        f({ key: "nurture_biggest_gap", label: "Biggest Nurture Gap", helper: "The trust-building system you're missing today.", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "Where does an interested prospect go if they're not ready to buy yet?",
        "What's your weekly rhythm for staying top-of-mind?",
        "Could retargeting recapture the 95% who don't convert first time?",
        "What kind of trust-building content do you wish you produced more of?",
        "Is there a community angle that would deepen retention?",
      ],
      feedback: [
        { threshold: 50, message: "Nurture foundation in place — keep layering trust signals." },
        { threshold: 80, message: "Strong nurture system. Your audience stays warm between touchpoints." },
        { threshold: 100, message: "Premium nurture engine — every touchpoint compounds trust." },
      ],
    },
    {
      id: "ascension",
      label: "Ascension Flow",
      icon: TrendingUp,
      description: `How ${noun} move through your value ladder after their first purchase.`,
      insight: `Your value ladder defines what to sell. Ascension defines how ${noun} actually climb it — and where revenue is leaking today.`,
      fields: [
        f({ key: "ascension_entry_point", label: "Entry Point Offer", helper: "Pre-filled from your free / lead offer in Offer Design when possible.", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "ascension_next_upgrade", label: "Next Logical Upgrade", helper: "The natural next purchase after the entry offer.", type: "textarea", rows: 3 }),
        f({ key: "ascension_premium_path", label: "Premium Ascension Path", helper: "Premium tier for your top 10% of buyers.", type: "textarea", rows: 3 }),
        f({ key: "ascension_retention_path", label: "Retention Path", helper: "Recurring offer that retains buyers long-term.", type: "textarea", rows: 3 }),
        f({ key: "ascension_monetization_gap", label: "Biggest Monetization Gap", helper: "No upsells, no retention, weak backend monetization, etc.", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "What's the natural next purchase after someone buys your entry offer?",
        "Where does a happy customer go to keep getting more value?",
        "What recurring offer could keep them in your ecosystem long-term?",
        "Which premium tier are your top buyers asking for?",
        "Where is revenue leaking out of your customer journey today?",
      ],
      feedback: [
        { threshold: 50, message: "Ascension path emerging — keep filling in the climb." },
        { threshold: 80, message: "Strong ascension flow. LTV is set up to compound." },
        { threshold: 100, message: "Complete monetization ecosystem — every customer has a clear next step." },
      ],
    },
  ];
}

export function getGrowthConfigFor(
  id: GrowthSubBlock,
  businessTypeId?: BusinessTypeId | string | null,
): GrowthSubBlockConfig {
  return getGrowthSystemConfig(businessTypeId).find((c) => c.id === id)!;
}

export function getGrowthFeedbackMessage(config: GrowthSubBlockConfig, progress: number): string | null {
  const matching = config.feedback.filter((f) => progress >= f.threshold);
  return matching.length ? matching[matching.length - 1].message : null;
}
