/**
 * Per-business-type micro-copy for every Offer Design field.
 * Drives placeholders + helper text so the workshop feels native.
 */
import type { BusinessTypeId } from "./businessTypes";
import type { OfferDesignData } from "./offerDesignTypes";

export interface FieldCopy {
  placeholder?: string;
  helper?: string;
}

export type OfferFieldCopy = Partial<Record<keyof OfferDesignData, FieldCopy>>;

export const OFFER_DESIGN_COPY: Record<BusinessTypeId, OfferFieldCopy> = {
  coach: {
    angle_new_vehicle: {
      placeholder: "Example: Instead of generic mindset advice, we use a 4-stage identity rewrite framework rooted in nervous-system regulation.",
      helper: "What makes your method genuinely new vs what they already tried.",
    },
    angle_better_results: {
      placeholder: "Example: Clients see emotional shifts in week 1 because we address root identity patterns, not just behaviors.",
    },
    angle_faster_outcome: {
      placeholder: "Example: First confidence breakthrough within 14 days vs the usual 3+ months in traditional coaching.",
    },
    angle_easier_process: {
      placeholder: "Example: 20-min daily practices + weekly 1:1 calls — no journaling marathons or rigid routines.",
    },
    angle_main_offer_name: {
      placeholder: "Example: The Confident Self Method — 90 days to rebuild self-trust.",
      helper: "Your flagship program name.",
    },
    angle_core_promise: {
      placeholder: "Example: Rebuild your confidence and self-trust in 90 days — guaranteed, or you don't pay the final installment.",
      helper: "Specific outcome + timeframe + ideally a guarantee.",
    },
    stack_core_deliverables: {
      placeholder: "Example: Weekly 1:1 coaching calls, monthly group container, signature 4-stage curriculum.",
    },
    stack_templates_resources: {
      placeholder: "Example: Identity rewrite worksheets, daily practice tracker, boundary-setting scripts.",
    },
    stack_support_system: {
      placeholder: "Example: Private Telegram for daily voice notes, monthly group Q&A, email support within 24h.",
    },
    stack_bonuses: {
      placeholder: "Example: Bonus: Healthy relationships masterclass + 30-day nervous system reset audio series.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: 90-day flagship container, with optional 6-month extension.",
    },
    stack_milestones: {
      placeholder: "Example: Week 1–2 awareness → Week 3–6 healing → Week 7–10 rebuild → Week 11–12 integration.",
    },
    pricing_core_price: {
      placeholder: "Example: €4,500 one-time for 90-day flagship coaching.",
    },
    pricing_payment_plans: {
      placeholder: "Example: 3x €1,650 monthly, or 6x €850 for accessibility.",
    },
    pricing_recurring: {
      placeholder: "Example: €197/mo alumni continuity for graduates (group calls + community).",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: VIP 1:1 intensive day at €3,000 add-on for accelerated breakthrough.",
    },
    pricing_guarantee: {
      placeholder: "Example: Full refund within 14 days, or final-payment waiver if you complete the work and don't see progress.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free 'Confident Self' starter audio + 5-day rebuild challenge.",
    },
    ladder_low_ticket: {
      placeholder: "Example: €47 mini-course: 'The 5 Identity Shifts that Rebuild Confidence'.",
    },
    ladder_core_offer: {
      placeholder: "Example: 90-day Confident Self Method — €4,500.",
      helper: "Pulled from your main offer above.",
    },
    ladder_premium_offer: {
      placeholder: "Example: 12-month mastermind with 4 retreats — €15,000.",
    },
    ladder_continuity: {
      placeholder: "Example: Alumni community + monthly call — €197/mo.",
    },
  },

  agency: {
    angle_new_vehicle: {
      placeholder: "Example: Instead of generalist agencies, we run a vertical-specific creative testing system built only for B2B SaaS.",
      helper: "What makes your delivery model genuinely different.",
    },
    angle_better_results: {
      placeholder: "Example: Average 3.4x ROAS within 90 days because all creative is built from our SaaS-specific message bank.",
    },
    angle_faster_outcome: {
      placeholder: "Example: First winning ad within 14 days thanks to our pre-built creative testing library.",
    },
    angle_easier_process: {
      placeholder: "Example: One weekly 30-min call + Slack channel. No bloated decks, no surprise invoices.",
    },
    angle_main_offer_name: {
      placeholder: "Example: The SaaS Pipeline Engine — done-for-you paid acquisition.",
    },
    angle_core_promise: {
      placeholder: "Example: 3x ROAS within 90 days or we work for free until we hit it.",
    },
    stack_core_deliverables: {
      placeholder: "Example: Strategy + creative production + media buying + weekly reporting + landing page CRO.",
    },
    stack_templates_resources: {
      placeholder: "Example: SaaS message bank, ad creative templates, attribution dashboard, weekly report template.",
    },
    stack_support_system: {
      placeholder: "Example: Dedicated Slack channel + weekly 30-min strategy call + monthly leadership review.",
    },
    stack_bonuses: {
      placeholder: "Example: Bonus: Quarterly market intelligence report + competitor ad teardown.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: 90-day pilot, then ongoing 6-month retainer.",
    },
    stack_milestones: {
      placeholder: "Example: Day 14 first winners → Day 30 scale → Day 60 attribution dashboard live → Day 90 case study.",
    },
    pricing_core_price: {
      placeholder: "Example: $7,500/mo retainer + 10% of ad spend over $30k/mo.",
    },
    pricing_payment_plans: {
      placeholder: "Example: Monthly billing or quarterly with 10% discount.",
    },
    pricing_recurring: {
      placeholder: "Example: 6-month minimum retainer with 30-day rolling after.",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: $25k strategic intensive — 2-day on-site workshop with leadership.",
    },
    pricing_guarantee: {
      placeholder: "Example: 90-day pilot guarantee — hit 3x ROAS or get the next month free.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free SaaS funnel audit + competitor ad teardown.",
    },
    ladder_low_ticket: {
      placeholder: "Example: $1,500 paid pilot diagnostic + 90-day roadmap.",
    },
    ladder_core_offer: {
      placeholder: "Example: $7,500/mo done-for-you paid acquisition retainer.",
    },
    ladder_premium_offer: {
      placeholder: "Example: $25k quarterly strategic engagement + on-site workshop.",
    },
    ladder_continuity: {
      placeholder: "Example: $2,000/mo light retention plan for graduated clients.",
    },
  },

  consultant: {
    angle_new_vehicle: {
      placeholder: "Example: Instead of generic frameworks, we run a 30-day diagnostic built for $5–30M ARR SaaS specifically.",
    },
    angle_better_results: {
      placeholder: "Example: Aligned leadership and a shared 12-month roadmap because our diagnostic surfaces the actual constraint, not symptoms.",
    },
    angle_faster_outcome: {
      placeholder: "Example: Leadership alignment in 30 days instead of 6+ months of internal debate.",
    },
    angle_easier_process: {
      placeholder: "Example: Tight cadence: weekly 60-min, no decks for the sake of decks, async between calls.",
    },
    angle_main_offer_name: {
      placeholder: "Example: The Growth Operating System — 90-day strategic engagement.",
    },
    angle_core_promise: {
      placeholder: "Example: A board-ready 12-month roadmap and aligned leadership in 90 days.",
    },
    stack_core_deliverables: {
      placeholder: "Example: 90-day engagement: diagnostic → roadmap → leadership alignment → operating cadence.",
    },
    stack_templates_resources: {
      placeholder: "Example: Diagnostic toolkit, roadmap template, OKR framework, weekly cadence template.",
    },
    stack_support_system: {
      placeholder: "Example: Weekly 60-min calls + async Slack/email + monthly board prep.",
    },
    stack_bonuses: {
      placeholder: "Example: Bonus: Quarterly leadership offsite facilitation + executive 1:1 coaching.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: 90 days for the core engagement, with optional ongoing fractional retainer.",
    },
    stack_milestones: {
      placeholder: "Example: Day 30 diagnostic → Day 60 roadmap → Day 90 operating cadence live.",
    },
    pricing_core_price: {
      placeholder: "Example: $45k for 90-day engagement.",
    },
    pricing_payment_plans: {
      placeholder: "Example: 3x $15k monthly or 50% upfront / 50% at day 60.",
    },
    pricing_recurring: {
      placeholder: "Example: $8k/mo fractional advisory after the 90-day engagement.",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: Board advisor seat at $25k/quarter + equity option.",
    },
    pricing_guarantee: {
      placeholder: "Example: If after day 30 you don't see the engagement value, full refund of remaining work.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free 30-min strategic audit call + custom diagnostic preview.",
    },
    ladder_low_ticket: {
      placeholder: "Example: $2,500 paid diagnostic workshop with leadership.",
    },
    ladder_core_offer: {
      placeholder: "Example: $45k Growth Operating System 90-day engagement.",
    },
    ladder_premium_offer: {
      placeholder: "Example: $100k annual fractional CXO advisory.",
    },
    ladder_continuity: {
      placeholder: "Example: $8k/mo ongoing advisory retainer.",
    },
  },

  "course-creator": {
    angle_new_vehicle: {
      placeholder: "Example: Instead of theory-heavy courses, we use a project-based curriculum where students ship real client work weekly.",
    },
    angle_better_results: {
      placeholder: "Example: 65% completion + average first paying client by week 8 because every module produces a portfolio piece.",
    },
    angle_faster_outcome: {
      placeholder: "Example: First client outreach in week 4 vs months of 'just one more tutorial'.",
    },
    angle_easier_process: {
      placeholder: "Example: 4 hours/week max — bite-size modules + weekly group accountability.",
    },
    angle_main_offer_name: {
      placeholder: "Example: First Paying Client Bootcamp — 12 weeks to your first $3k client.",
    },
    angle_core_promise: {
      placeholder: "Example: Land your first paying design client within 90 days of finishing the program.",
    },
    stack_core_deliverables: {
      placeholder: "Example: 12 weekly modules, 6 live group calls, project feedback, peer cohort.",
    },
    stack_templates_resources: {
      placeholder: "Example: Outreach scripts, portfolio templates, pricing calculator, contract templates.",
    },
    stack_support_system: {
      placeholder: "Example: Slack community, weekly office hours, monthly portfolio reviews.",
    },
    stack_bonuses: {
      placeholder: "Example: Bonus: Personal brand mini-course + lifetime alumni access.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: 12-week cohort, with lifetime access to materials + alumni community.",
    },
    stack_milestones: {
      placeholder: "Example: Week 4 portfolio piece → Week 8 first outreach → Week 12 first client signed.",
    },
    pricing_core_price: {
      placeholder: "Example: $1,500 cohort enrollment.",
    },
    pricing_payment_plans: {
      placeholder: "Example: 3x $550 monthly or pay-in-full $1,500.",
    },
    pricing_recurring: {
      placeholder: "Example: $47/mo alumni continuity + ongoing live calls.",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: VIP 1:1 portfolio review + personal feedback at $1,000 add-on.",
    },
    pricing_guarantee: {
      placeholder: "Example: 14-day refund + 'land a client by day 90 or get a free extra cohort'.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free 5-day 'Portfolio in a Week' challenge.",
    },
    ladder_low_ticket: {
      placeholder: "Example: $97 'First Outreach Toolkit' mini-course.",
    },
    ladder_core_offer: {
      placeholder: "Example: $1,500 First Paying Client Bootcamp.",
    },
    ladder_premium_offer: {
      placeholder: "Example: $5,000 1:1 mentorship intensive over 6 months.",
    },
    ladder_continuity: {
      placeholder: "Example: $47/mo alumni community + monthly live calls.",
    },
  },

  ecommerce: {
    angle_new_vehicle: {
      placeholder: "Example: Instead of trend-chasing, our skincare uses a 3-step routine built for sensitive skin in 28+.",
    },
    angle_better_results: {
      placeholder: "Example: Visible glow in 14 days because of clinically validated actives at the right concentration.",
    },
    angle_faster_outcome: {
      placeholder: "Example: First visible result in 7 days vs typical 6+ weeks for drugstore brands.",
    },
    angle_easier_process: {
      placeholder: "Example: 3-step morning routine, under 4 minutes — no 12-step rituals.",
    },
    angle_main_offer_name: {
      placeholder: "Example: The Glow System — our complete starter routine.",
    },
    angle_core_promise: {
      placeholder: "Example: Visibly healthier, calmer skin in 30 days — or full refund.",
    },
    stack_core_deliverables: {
      placeholder: "Example: Cleanser + serum + moisturizer in the starter bundle.",
    },
    stack_templates_resources: {
      placeholder: "Example: Personalized routine guide, skin tracker app, ingredient encyclopedia.",
    },
    stack_support_system: {
      placeholder: "Example: WhatsApp concierge, monthly skincare Q&A live, email support.",
    },
    stack_bonuses: {
      placeholder: "Example: Bonus: Free travel-size kit + skin quiz consultation.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: Ships in 48 hours, lasts 60 days. Subscription option every 60 days.",
    },
    stack_milestones: {
      placeholder: "Example: Day 7 first glow → Day 14 reduced redness → Day 30 transformed routine.",
    },
    pricing_core_price: {
      placeholder: "Example: €89 for the Glow System starter bundle (one-time).",
    },
    pricing_payment_plans: {
      placeholder: "Example: Klarna pay-in-3 €30/month available at checkout.",
    },
    pricing_recurring: {
      placeholder: "Example: €74/60 days subscription with free shipping (15% off).",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: €149 Pro Glow Kit with serum + retinol overnight + concierge consult.",
    },
    pricing_guarantee: {
      placeholder: "Example: 30-day full refund if you don't see results — keep the product.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free 2-min skin quiz with personalized routine recommendation.",
    },
    ladder_low_ticket: {
      placeholder: "Example: €19 travel-size 'Glow Trial Kit'.",
    },
    ladder_core_offer: {
      placeholder: "Example: €89 Glow System starter bundle.",
    },
    ladder_premium_offer: {
      placeholder: "Example: €149 Pro Glow Kit + concierge skin consult.",
    },
    ladder_continuity: {
      placeholder: "Example: Auto-replenish subscription every 60 days at 15% off.",
    },
  },

  "local-business": {
    angle_new_vehicle: {
      placeholder: "Example: Instead of generic technicians, we send certified specialists with 24-hour follow-ups built into every job.",
    },
    angle_better_results: {
      placeholder: "Example: 98% 5-star reviews because we follow up after every job and fix anything that's not perfect.",
    },
    angle_faster_outcome: {
      placeholder: "Example: Same-day quotes + next-day install for most repairs.",
    },
    angle_easier_process: {
      placeholder: "Example: Online booking + flat-rate pricing + text updates — no surprises.",
    },
    angle_main_offer_name: {
      placeholder: "Example: The Trusted Home Pro Plan — fast, fair, friendly HVAC service.",
    },
    angle_core_promise: {
      placeholder: "Example: 24-hour response or your service call is free.",
    },
    stack_core_deliverables: {
      placeholder: "Example: Diagnostic + repair + 90-day workmanship warranty + follow-up call.",
    },
    stack_templates_resources: {
      placeholder: "Example: Maintenance checklist, seasonal tune-up guide, home efficiency report.",
    },
    stack_support_system: {
      placeholder: "Example: SMS updates, online booking, 24-hour callback line, post-job follow-up.",
    },
    stack_bonuses: {
      placeholder: "Example: Bonus: Free annual filter + free seasonal system check.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: Same-day quotes, next-day service for 90% of jobs.",
    },
    stack_milestones: {
      placeholder: "Example: Call → quote → service → follow-up → optional annual maintenance plan.",
    },
    pricing_core_price: {
      placeholder: "Example: $149 service call (waived if you book the repair).",
    },
    pricing_payment_plans: {
      placeholder: "Example: 0% financing for 12 months on jobs over $2,500.",
    },
    pricing_recurring: {
      placeholder: "Example: $19/mo Comfort Club: 2 tune-ups/yr + priority booking + 15% off repairs.",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: Premium full-system replacement package with 10-yr warranty.",
    },
    pricing_guarantee: {
      placeholder: "Example: 100% workmanship guarantee — if it's not right, we fix it free.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free in-home estimate or phone diagnostic.",
    },
    ladder_low_ticket: {
      placeholder: "Example: $79 seasonal tune-up special for new customers.",
    },
    ladder_core_offer: {
      placeholder: "Example: Standard repair / install service.",
    },
    ladder_premium_offer: {
      placeholder: "Example: Full system replacement + 10-yr warranty package.",
    },
    ladder_continuity: {
      placeholder: "Example: $19/mo Comfort Club membership.",
    },
  },

  other: {
    angle_new_vehicle: {
      placeholder: "Example: Describe what makes your method genuinely different from what they've tried.",
    },
    angle_better_results: {
      placeholder: "Example: Why your approach produces meaningfully better outcomes.",
    },
    angle_faster_outcome: {
      placeholder: "Example: How clients see results faster than the typical timeline.",
    },
    angle_easier_process: {
      placeholder: "Example: How you remove the usual friction or complexity.",
    },
    angle_main_offer_name: {
      placeholder: "Example: Your flagship offer name and one-line description.",
    },
    angle_core_promise: {
      placeholder: "Example: The specific outcome + timeframe + guarantee you stand behind.",
    },
    stack_core_deliverables: {
      placeholder: "Example: The main service / program components you deliver.",
    },
    stack_templates_resources: {
      placeholder: "Example: Templates, scripts, frameworks or assets included.",
    },
    stack_support_system: {
      placeholder: "Example: Calls, chat, community or email support included.",
    },
    stack_bonuses: {
      placeholder: "Example: Extra incentives or fast-action bonuses.",
    },
    stack_delivery_timeline: {
      placeholder: "Example: How long delivery takes (7/30/90 days, 12 months, ongoing).",
    },
    stack_milestones: {
      placeholder: "Example: Step-by-step transformation journey with clear milestones.",
    },
    pricing_core_price: {
      placeholder: "Example: Your main offer price.",
    },
    pricing_payment_plans: {
      placeholder: "Example: Monthly plans or staged payments available.",
    },
    pricing_recurring: {
      placeholder: "Example: Optional monthly continuity / subscription.",
    },
    pricing_premium_upgrade: {
      placeholder: "Example: VIP / premium upgrade tier.",
    },
    pricing_guarantee: {
      placeholder: "Example: Risk-reversal or money-back guarantee.",
    },
    ladder_free_offer: {
      placeholder: "Example: Free lead magnet, audit, webinar or training.",
    },
    ladder_low_ticket: {
      placeholder: "Example: Mini course, challenge or workshop.",
    },
    ladder_core_offer: {
      placeholder: "Example: Your main offer (linked to flagship above).",
    },
    ladder_premium_offer: {
      placeholder: "Example: Mastermind, consulting or VIP tier.",
    },
    ladder_continuity: {
      placeholder: "Example: Membership, retainer or subscription.",
    },
  },
};

export function getOfferFieldCopy(
  businessTypeId: BusinessTypeId | string | null | undefined,
  fieldKey: keyof OfferDesignData,
): FieldCopy {
  const id = (businessTypeId && businessTypeId in OFFER_DESIGN_COPY ? businessTypeId : "coach") as BusinessTypeId;
  return OFFER_DESIGN_COPY[id]?.[fieldKey] ?? OFFER_DESIGN_COPY.coach[fieldKey] ?? {};
}
