import { Lightbulb, Layers, DollarSign, TrendingUp, type LucideIcon } from "lucide-react";
import type { OfferDesignData, OfferSubBlock } from "./offerDesignTypes";
import { getBusinessType, type BusinessTypeId } from "./businessTypes";
import { getOfferFieldCopy } from "./offerDesignCopy";
import type { FieldDef } from "./clarityConfig";

export interface OfferSubBlockConfig {
  id: OfferSubBlock;
  label: string;
  icon: LucideIcon;
  description: string;
  insight: string;
  fields: (FieldDef & { key: keyof OfferDesignData })[];
  coachQuestions: string[];
  feedback: { threshold: number; message: string }[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function getOfferDesignConfig(
  businessTypeId?: BusinessTypeId | string | null,
): OfferSubBlockConfig[] {
  const bt = getBusinessType(businessTypeId);
  const noun = bt.customerNoun;
  const Noun = cap(noun);

  const f = (
    base: Omit<FieldDef, "placeholder" | "helper"> & {
      key: keyof OfferDesignData;
      placeholder?: string;
      helper?: string;
    },
  ): FieldDef & { key: keyof OfferDesignData } => {
    const copy = getOfferFieldCopy(bt.id, base.key);
    return {
      ...base,
      placeholder: copy.placeholder ?? base.placeholder,
      helper: copy.helper ?? base.helper,
    };
  };

  return [
    {
      id: "angle",
      label: "Offer Angle",
      icon: Lightbulb,
      description: `Craft a compelling angle that makes your offer impossible to ignore for ${noun}.`,
      insight: `${Noun} buy from the offer that feels uniquely built for their problem. A strong angle = a stronger close.`,
      fields: [
        f({ key: "angle_new_vehicle", label: "New Vehicle", helper: "How is your method different from what they already tried?", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "angle_better_results", label: "Better Results", helper: "Why does your method produce better results?", type: "textarea", rows: 3 }),
        f({ key: "angle_faster_outcome", label: "Faster Outcome", helper: "How do clients get results faster?", type: "textarea", rows: 3 }),
        f({ key: "angle_easier_process", label: "Easier Process", helper: "How do you make the process feel easier?", type: "textarea", rows: 3 }),
        f({ key: "angle_main_offer_name", label: "Main Offer Name", helper: "What is your flagship offer called?", type: "textarea", rows: 2 }),
        f({ key: "angle_core_promise", label: "Core Transformation Promise", helper: "What specific outcome do clients achieve?", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "What's the #1 thing that makes your method different?",
        `Why do ${noun} get better results with you than with alternatives?`,
        "How is the timeline meaningfully faster?",
        "What friction or complexity have you removed?",
        "What outcome do you confidently promise?",
      ],
      feedback: [
        { threshold: 50, message: "Good start — keep sharpening what makes your offer truly different." },
        { threshold: 80, message: "Strong angle. Your offer is starting to feel like the obvious choice." },
        { threshold: 100, message: "World-class positioning. This angle will lift every conversion." },
      ],
    },
    {
      id: "stack",
      label: "Offer Stack",
      icon: Layers,
      description: "Define exactly what people receive when they buy.",
      insight: `A clear stack removes confusion. ${Noun} need to instantly see what's included and why it's worth more than the price.`,
      fields: [
        f({ key: "stack_core_deliverables", label: "Core Deliverables", helper: "Main service, coaching or program components.", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "stack_templates_resources", label: "Templates & Resources", helper: "Scripts, SOPs, frameworks, templates, assets.", type: "textarea", rows: 3 }),
        f({ key: "stack_support_system", label: "Support System", helper: "Calls, Slack, WhatsApp, email, community, etc.", type: "textarea", rows: 3 }),
        f({ key: "stack_bonuses", label: "Bonuses", helper: "Additional incentives that tip the decision.", type: "textarea", rows: 3 }),
        f({ key: "stack_delivery_timeline", label: "Delivery Timeline", helper: "7 days / 30 days / 90 days / 12 months — over what timeframe is the value delivered.", type: "textarea", rows: 3 }),
        f({ key: "stack_milestones", label: "Milestones / Roadmap", helper: "Step-by-step transformation journey through your offer.", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "What does someone actually receive on day 1?",
        "Which templates or assets save them the most time?",
        "How and how often will they be supported?",
        "What bonuses tip the deal in your favor?",
        "What are the key milestones along the journey?",
      ],
      feedback: [
        { threshold: 50, message: "Solid foundation. Keep adding clarity to each component." },
        { threshold: 80, message: "Strong stack. The perceived value is clearly stacking up." },
        { threshold: 100, message: "Premium-level stack. The price will feel like a no-brainer." },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      icon: DollarSign,
      description: "Monetize your offer with confidence — anchored, flexible and risk-reversed.",
      insight: `Smart pricing creates options. Anchor with premium, give a flexible plan, and reverse risk so buying is the safe choice.`,
      fields: [
        f({ key: "pricing_core_price", label: "Core Price", helper: "The headline price for your main offer.", type: "textarea", rows: 2 }),
        f({ key: "pricing_payment_plans", label: "Payment Plans", helper: "Monthly or staged options that lower the barrier.", type: "textarea", rows: 2 }),
        f({ key: "pricing_recurring", label: "Recurring Option", helper: "Subscription, retainer or membership pricing.", type: "textarea", rows: 2 }),
        f({ key: "pricing_premium_upgrade", label: "Premium Upgrade Option", helper: "VIP / high-touch tier that anchors the core price.", type: "textarea", rows: 2 }),
        f({ key: "pricing_guarantee", label: "Risk Reversal / Guarantee", helper: "How you remove the risk of saying yes.", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "What's the price you can confidently defend?",
        "What payment plan removes the biggest objection?",
        "Could you add a recurring tier for ongoing value?",
        "What VIP option could anchor the core price?",
        "What guarantee makes saying yes feel safe?",
      ],
      feedback: [
        { threshold: 50, message: "Pricing is taking shape — keep layering options." },
        { threshold: 80, message: "Strong pricing. Buyers will see clear value at every tier." },
        { threshold: 100, message: "Excellent. Your pricing now sells itself." },
      ],
    },
    {
      id: "ladder",
      label: "Value Ladder",
      icon: TrendingUp,
      description: `Map the journey from free entry to your highest-value offer for ${noun}.`,
      insight: `Most ${noun} aren't ready for the core offer immediately. A clear ladder lets them ascend at their pace — and lifts your LTV dramatically.`,
      fields: [
        f({ key: "ladder_free_offer", label: "Free Offer", helper: "Lead magnet, audit, webinar or free training.", type: "textarea", fullWidth: true, rows: 3 }),
        f({ key: "ladder_low_ticket", label: "Low Ticket Offer", helper: "Mini course, challenge or workshop.", type: "textarea", rows: 3 }),
        f({ key: "ladder_core_offer", label: "Core Offer", helper: "Pulled from your main flagship offer above.", type: "textarea", rows: 3 }),
        f({ key: "ladder_premium_offer", label: "Premium Offer", helper: "Mastermind, consulting or VIP tier.", type: "textarea", rows: 3 }),
        f({ key: "ladder_continuity", label: "Continuity Offer", helper: "Membership, retainer or subscription.", type: "textarea", fullWidth: true, rows: 3 }),
      ],
      coachQuestions: [
        "What free offer warms them up fastest?",
        "What low-ticket buy proves they're a real buyer?",
        "Which offer is your true core right now?",
        "What premium tier could you offer your top 10%?",
        "What recurring offer keeps revenue and value flowing?",
      ],
      feedback: [
        { threshold: 50, message: "Nice baseline. Keep mapping each step of the ladder." },
        { threshold: 80, message: "Strong ladder. You've built a real ascension path." },
        { threshold: 100, message: "Complete value ladder — your LTV will compound." },
      ],
    },
  ];
}

export function getOfferConfigFor(
  id: OfferSubBlock,
  businessTypeId?: BusinessTypeId | string | null,
): OfferSubBlockConfig {
  return getOfferDesignConfig(businessTypeId).find((c) => c.id === id)!;
}

export function getOfferFeedbackMessage(config: OfferSubBlockConfig, progress: number): string | null {
  const matching = config.feedback.filter((f) => progress >= f.threshold);
  return matching.length ? matching[matching.length - 1].message : null;
}
