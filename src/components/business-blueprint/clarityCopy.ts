/**
 * Per-business-type micro-copy for every Customer Clarity field.
 * This drives placeholders + helper text so the entire workshop
 * feels native to the user's business model, not just the avatar block.
 *
 * Add a new business type: add an entry to CLARITY_COPY keyed by BusinessTypeId.
 */
import type { BusinessTypeId } from "./businessTypes";
import type { CustomerClarityData } from "./types";

export interface FieldCopy {
  placeholder?: string;
  helper?: string;
}

export type ClarityFieldCopy = Partial<Record<keyof CustomerClarityData, FieldCopy>>;

export const CLARITY_COPY: Record<BusinessTypeId, ClarityFieldCopy> = {
  coach: {
    avatar_who: {
      placeholder: "Example: Women 30–45 rebuilding confidence after a toxic relationship who want to feel safe in themselves again.",
      helper: "Be specific — situation, identity, stage of life, urgency.",
    },
    avatar_type: { helper: "Pick the closest sub-niche of coaching you operate in." },
    avatar_stage: {
      placeholder: "Example: Recently divorced and struggling to rebuild confidence after a toxic relationship.",
      helper: "The specific situation, life moment, or struggle they're in right now.",
    },
    desire_success_vision: {
      placeholder: "Example: Waking up calm and confident, attracting healthy relationships, finally proud of who they're becoming and trusting their own decisions.",
      helper: "Capture the dream scenario, emotional shift, lifestyle, identity and freedom — all in one rich picture.",
    },
    transformation_process: {
      placeholder: "Example: Heal old wounds → rebuild self-trust → set healthy boundaries → step into the confident new identity.",
      helper: "The journey, method or step-by-step process you guide them through.",
    },
    avatar_niche: {
      placeholder: "Example: Transformational coaching for women rebuilding self-worth after heartbreak.",
      helper: "One clear sentence on the market you serve.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter… (e.g. open-minded, ambitious, spiritual)",
      helper: "Mindset, identity markers, values that define them.",
    },
    avatar_not_fit: {
      placeholder: "Example: People wanting overnight results, unwilling to do inner work, or looking for therapy instead of coaching.",
      helper: "Knowing who to exclude sharpens your messaging.",
    },
    pain_main_problem: {
      placeholder: "Example: They feel stuck in the same emotional patterns, lacking confidence and direction.",
      helper: "Name the dominant pain in their words, not yours.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: Overthinking decisions, comparing themselves to others, struggling to set boundaries.",
    },
    pain_blockers: {
      placeholder: "Example: Limiting beliefs, no support system, fear of judgment, lack of accountability.",
    },
    pain_already_tried: {
      placeholder: "Example: Free YouTube content, generic self-help books, willpower-based plans, therapy that didn't click.",
    },
    pain_why_failed: {
      placeholder: "Example: No personalized strategy, no accountability, didn't address the root identity work.",
    },
    pain_consequences: {
      placeholder: "Example: Staying stuck in the same patterns, losing confidence, drifting from who they want to become.",
      helper: "Both practical and emotional consequences.",
    },
    desire_main_result: {
      placeholder: "Example: Feel confident, grounded and at peace with who they are — finally trusting themselves.",
    },
    desire_dream_scenario: {
      placeholder: "Example: Waking up feeling calm and clear, attracting healthy relationships, leading their life from strength instead of fear.",
    },
    desire_emotional_change: {
      placeholder: "Example: Confidence, peace, self-trust, pride, freedom from old wounds.",
    },
    desire_lifestyle: {
      placeholder: "Example: Becoming the strong, confident, magnetic version of themselves they always knew was possible.",
    },
    desire_why_badly: {
      placeholder: "Example: To finally feel proud of who they're becoming and stop carrying the weight of old pain.",
      helper: "Dig deeper than surface-level goals.",
    },
    transformation_point_a: {
      placeholder: "Example: Anxious, second-guessing every decision, stuck repeating old patterns, quietly losing hope.",
      helper: "Their pain, situation and identity today.",
    },
    transformation_point_b: {
      placeholder: "Example: Calm, grounded, confident in their decisions, leading their life from a place of self-trust.",
      helper: "Their outcome, situation and new identity.",
    },
    transformation_external: {
      placeholder: "Example: Healthier relationships, stronger boundaries, visible energy and presence shift.",
    },
    transformation_internal: {
      placeholder: "Example: Confidence, self-trust, sense of identity, inner peace.",
    },
    transformation_possible: {
      placeholder: "Example: Healthier relationships, deeper purpose, the courage to take bold new leaps.",
    },
  },

  agency: {
    avatar_who: {
      placeholder: "Example: B2B SaaS founders at $50–250k MRR who need a paid ads partner that can ship and report fast.",
      helper: "Be specific — company stage, role, urgency, deal size.",
    },
    avatar_type: { helper: "Pick the closest sub-niche of agency you operate." },
    avatar_stage: {
      placeholder: "Example: Stuck at $40k MRR, just lost their last agency, and need a partner who can ship results in 60 days.",
      helper: "Their company stage, urgency and what's pushing them to act now.",
    },
    desire_success_vision: {
      placeholder: "Example: A predictable acquisition engine, defendable 3x+ ROAS, weekly clear reporting, and case-study-worthy growth they can show the board.",
      helper: "The full picture: business outcome, emotional relief, leadership identity and the lifestyle that comes with it.",
    },
    transformation_process: {
      placeholder: "Example: Audit & strategy → creative & funnel build → launch & test → scale winners → ongoing optimization.",
      helper: "The roadmap, framework or delivery process that takes them from A to B.",
    },
    avatar_niche: {
      placeholder: "Example: Paid acquisition for B2B SaaS in the $50–250k MRR range.",
      helper: "Tight niche = sharper positioning and easier sales.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter… (e.g. data-driven, fast-moving, growth-obsessed)",
      helper: "Decision style, growth mindset, working style.",
    },
    avatar_not_fit: {
      placeholder: "Example: Pre-revenue startups, businesses without product-market fit, anyone under $20k MRR.",
      helper: "Excluding the wrong fit raises close rate and retention.",
    },
    pain_main_problem: {
      placeholder: "Example: Burning ad spend with no clear attribution, churning agencies, unclear ROI on every quarter.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: Missed reporting deadlines, slow agency communication, weak creative output, account managers turning over.",
    },
    pain_blockers: {
      placeholder: "Example: No internal marketing lead, fragmented data, inconsistent creative testing, weak landing pages.",
    },
    pain_already_tried: {
      placeholder: "Example: Hiring freelancers, switching agencies, building in-house, multiple lead gen tactics.",
    },
    pain_why_failed: {
      placeholder: "Example: Generalist agencies without vertical expertise, no senior strategy, no skin in the game.",
    },
    pain_consequences: {
      placeholder: "Example: Stagnant MRR, burnt cash, lost board confidence, missed runway targets.",
      helper: "Tie this to revenue and leadership credibility.",
    },
    desire_main_result: {
      placeholder: "Example: Predictable pipeline of qualified meetings and a 3x+ ROAS they can defend in board meetings.",
    },
    desire_dream_scenario: {
      placeholder: "Example: A reliable acquisition engine, weekly clear reporting, and case-study-worthy growth they can show off.",
    },
    desire_emotional_change: {
      placeholder: "Example: Calm, confidence in their numbers, freedom from constant firefighting.",
    },
    desire_lifestyle: {
      placeholder: "Example: Recognized as the category leader in their vertical, hiring with confidence, building real enterprise value.",
    },
    desire_why_badly: {
      placeholder: "Example: To prove the business model works, hit the next funding milestone, and finally take real time off.",
    },
    transformation_point_a: {
      placeholder: "Example: $40k MRR, ad spend feels like a leak, no clear attribution, founder still running marketing on the side.",
    },
    transformation_point_b: {
      placeholder: "Example: $100k+ MRR with a documented acquisition engine, repeatable case studies, and a marketing team that runs without them.",
    },
    transformation_external: {
      placeholder: "Example: MRR growth, retention rate, team size, recognized authority in their vertical.",
    },
    transformation_internal: {
      placeholder: "Example: Confidence in the numbers, decisiveness, peace of mind around growth.",
    },
    transformation_possible: {
      placeholder: "Example: Hire senior leadership, raise the next round, expand into a second product line.",
    },
  },

  consultant: {
    avatar_who: {
      placeholder: "Example: VP-level execs at $10–50M ARR SaaS companies needing an outside operator's perspective on growth.",
      helper: "Role, company size and the strategic moment they're in.",
    },
    avatar_type: { helper: "Pick the closest consulting specialty you offer." },
    avatar_stage: {
      placeholder: "Example: Newly appointed VP of Growth at a $15M ARR SaaS, under board pressure to fix pipeline in two quarters.",
      helper: "Their role, business stage and the strategic moment they're in.",
    },
    desire_success_vision: {
      placeholder: "Example: A clear 12-month roadmap, aligned leadership, visible quarterly progress — and personal recognition as the operator who turned it around.",
      helper: "Strategic outcome, emotional confidence, identity shift and lifestyle of recognized expertise.",
    },
    transformation_process: {
      placeholder: "Example: Diagnostic → roadmap → align leadership → operating cadence → quarterly review and iteration.",
      helper: "The advisory framework or engagement structure that delivers the outcome.",
    },
    avatar_niche: {
      placeholder: "Example: Growth strategy for B2B SaaS between $5–30M ARR.",
      helper: "Industry + stage + functional area = sharp positioning.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter… (e.g. analytical, action-biased, candid)",
      helper: "Leadership style, decision-making and openness to advice.",
    },
    avatar_not_fit: {
      placeholder: "Example: Companies seeking the cheapest option, founders unable to act on recommendations, or pre-PMF startups.",
    },
    pain_main_problem: {
      placeholder: "Example: Internal teams stuck in execution; no clear strategic roadmap or prioritization.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: Conflicting priorities from leadership, slow decision-making, missing data, stalled initiatives.",
    },
    pain_blockers: {
      placeholder: "Example: No senior strategist in-house, fragmented systems, political tension, lack of operating cadence.",
    },
    pain_already_tried: {
      placeholder: "Example: Internal task forces, big-firm consultants, hiring senior talent that didn't stick.",
    },
    pain_why_failed: {
      placeholder: "Example: Generic frameworks, no operator experience, recommendations not tailored to their specific stage.",
    },
    pain_consequences: {
      placeholder: "Example: Missed targets, board pressure, leadership turnover, eroding market position.",
    },
    desire_main_result: {
      placeholder: "Example: A clear 12-month roadmap, aligned leadership, and visible progress on the metrics that matter.",
    },
    desire_dream_scenario: {
      placeholder: "Example: A focused leadership team executing against a shared plan, with the consultant as their trusted thought partner.",
    },
    desire_emotional_change: {
      placeholder: "Example: Clarity, confidence, calm — and certainty they're working on the right things.",
    },
    desire_lifestyle: {
      placeholder: "Example: Recognized industry voice, premium engagements, selective client roster, real impact on real businesses.",
    },
    desire_why_badly: {
      placeholder: "Example: To hit the next stage of growth, restore board confidence and secure the next funding round.",
    },
    transformation_point_a: {
      placeholder: "Example: Leadership firefighting weekly, no shared roadmap, growth flatlined, advisors disagreeing on priorities.",
    },
    transformation_point_b: {
      placeholder: "Example: Aligned leadership, documented strategy, visible quarterly progress, board renewed confidence.",
    },
    transformation_external: {
      placeholder: "Example: Recurring engagements, productized offer, recognized framework, premium pricing.",
    },
    transformation_internal: {
      placeholder: "Example: Strategic confidence, decisive leadership, calm under pressure.",
    },
    transformation_possible: {
      placeholder: "Example: Raise the next round, expand into adjacent markets, exit on their terms.",
    },
  },

  "course-creator": {
    avatar_who: {
      placeholder: "Example: Aspiring freelance designers in their 20s–30s who want to land their first $3k/mo client this quarter.",
      helper: "Their level, ambition and time horizon.",
    },
    avatar_type: { helper: "Pick the closest course / education category." },
    avatar_stage: {
      placeholder: "Example: Working a 9–5 they hate, learning design at night, ready to land their first paying client this quarter.",
      helper: "Their current situation, motivation and the moment they're choosing to invest.",
    },
    desire_success_vision: {
      placeholder: "Example: A portfolio they're proud of, paying clients in their inbox, freedom to work from anywhere, and the identity of a real professional.",
      helper: "Outcome + emotional pride + lifestyle + new identity, captured in one vivid picture.",
    },
    transformation_process: {
      placeholder: "Example: Foundations → first project → portfolio → outreach playbook → first paying client → repeat & raise rates.",
      helper: "The step-by-step path through your program that produces the outcome.",
    },
    avatar_niche: {
      placeholder: "Example: Step-by-step program for aspiring freelance designers landing their first paying clients.",
      helper: "Audience + outcome makes the program impossible to ignore.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter… (e.g. self-directed, curious, results-hungry)",
      helper: "Learning style, motivation and accountability needs.",
    },
    avatar_not_fit: {
      placeholder: "Example: Buyers looking for shortcuts, people who collect courses but never finish, anyone unwilling to do the assignments.",
    },
    pain_main_problem: {
      placeholder: "Example: They're drowning in free tutorials, have no clear path, and can't land paying clients.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: Tutorial overwhelm, half-finished projects, comparing themselves to creators on social media.",
    },
    pain_blockers: {
      placeholder: "Example: No structured roadmap, no accountability, weak portfolio, fear of charging for their work.",
    },
    pain_already_tried: {
      placeholder: "Example: Free YouTube tutorials, $30 Udemy courses, Reddit threads, generic 'guru' programs.",
    },
    pain_why_failed: {
      placeholder: "Example: No personalized feedback, no clear sequence, no community to keep them moving.",
    },
    pain_consequences: {
      placeholder: "Example: Another year stuck in their day job, watching peers grow, losing belief they can actually do this.",
    },
    desire_main_result: {
      placeholder: "Example: Land their first paying client and prove to themselves they can build a real career on their terms.",
    },
    desire_dream_scenario: {
      placeholder: "Example: A portfolio they're proud of, clients in their inbox, and a community of peers achieving the same.",
    },
    desire_emotional_change: {
      placeholder: "Example: Confidence, pride, momentum, the belief that 'I can actually do this'.",
    },
    desire_lifestyle: {
      placeholder: "Example: Working from anywhere, choosing their projects, and being known as someone who delivers great work.",
    },
    desire_why_badly: {
      placeholder: "Example: To finally escape the job they hate and prove to themselves (and family) it was the right bet.",
    },
    transformation_point_a: {
      placeholder: "Example: Stuck in tutorial loops, no portfolio, no clients, quietly doubting they have what it takes.",
    },
    transformation_point_b: {
      placeholder: "Example: Confident creator with a strong portfolio, paying clients, and a clear path to full-time freelance income.",
    },
    transformation_external: {
      placeholder: "Example: Portfolio quality, paying clients, monthly revenue, recognizable craft.",
    },
    transformation_internal: {
      placeholder: "Example: Identity shift from 'student' to 'professional', confidence and pride in their work.",
    },
    transformation_possible: {
      placeholder: "Example: Quit the day job, raise rates, launch their own product, mentor others on the same path.",
    },
  },

  ecommerce: {
    avatar_who: {
      placeholder: "Example: Eco-conscious women 28–45 buying premium skincare who care about clean ingredients and brand story.",
      helper: "Demographic + buying motivation + values.",
    },
    avatar_type: { helper: "Pick the closest product category you sell in." },
    avatar_stage: {
      placeholder: "Example: Busy professionals 28–40 looking for convenient, healthy meal options after burning out on cooking.",
      helper: "The life situation or buying moment that brings them to your store.",
    },
    desire_success_vision: {
      placeholder: "Example: A simple routine that actually works, visible glow, compliments from friends, a brand they're proud to recommend.",
      helper: "Visible product result + emotional confidence + lifestyle fit + brand identity.",
    },
    transformation_process: {
      placeholder: "Example: Skin quiz → starter routine → 30-day glow result → upgrade to full system → repeat & refer.",
      helper: "The customer journey from first purchase to loyal repeat buyer.",
    },
    avatar_niche: {
      placeholder: "Example: Premium clean skincare for women 28–45 in the DACH region.",
      helper: "Category + customer + region = sharper positioning and ad targeting.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter… (e.g. quality-driven, brand-loyal, label-readers)",
      helper: "Values, lifestyle markers and shopping behavior.",
    },
    avatar_not_fit: {
      placeholder: "Example: Bargain hunters, one-time gift buyers, customers who only respond to deep discounts.",
    },
    pain_main_problem: {
      placeholder: "Example: Their current product underdelivers — irritation, ingredients they don't trust, no visible results.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: Reading confusing labels, breakouts from new brands, wasting money on products that don't work.",
    },
    pain_blockers: {
      placeholder: "Example: Skepticism of marketing claims, sensitive skin, overwhelmed by too many options.",
    },
    pain_already_tried: {
      placeholder: "Example: Drugstore brands, dermatologist samples, switching between TikTok-viral products.",
    },
    pain_why_failed: {
      placeholder: "Example: Generic formulas not made for their skin type, harsh actives, poor routines without guidance.",
    },
    pain_consequences: {
      placeholder: "Example: Lower self-confidence, money wasted on a shelf full of half-used bottles, distrust of the entire category.",
    },
    desire_main_result: {
      placeholder: "Example: Visibly healthier skin in 30 days using a routine they trust and love using.",
    },
    desire_dream_scenario: {
      placeholder: "Example: Glowing skin, compliments from friends, a routine they look forward to every morning.",
    },
    desire_emotional_change: {
      placeholder: "Example: Confidence, pride in how they look, calm trust in their skincare brand.",
    },
    desire_lifestyle: {
      placeholder: "Example: Effortless beauty routine, a brand they're proud to share, products that fit their values.",
    },
    desire_why_badly: {
      placeholder: "Example: To finally feel comfortable in their own skin without makeup or filters.",
    },
    transformation_point_a: {
      placeholder: "Example: Cluttered bathroom shelf, recurring breakouts, distrust of brands, frustrated with results.",
    },
    transformation_point_b: {
      placeholder: "Example: A simple, effective routine, glowing skin, a brand they recommend to friends.",
    },
    transformation_external: {
      placeholder: "Example: Visible skin improvement, simplified routine, repeat purchases, social proof to friends.",
    },
    transformation_internal: {
      placeholder: "Example: Confidence, self-image, brand loyalty, peace of mind about ingredients.",
    },
    transformation_possible: {
      placeholder: "Example: Going makeup-free more often, refreshing their entire self-care lifestyle, becoming a brand evangelist.",
    },
  },

  "local-business": {
    avatar_who: {
      placeholder: "Example: Homeowners 35–60 within 30 minutes of our shop who need fast, reliable HVAC service they can trust.",
      helper: "Geography + life stage + the urgency that brings them in.",
    },
    avatar_type: { helper: "Pick the closest local business category." },
    avatar_stage: {
      placeholder: "Example: Homeowners needing urgent HVAC repairs before winter — burned by a previous unreliable provider.",
      helper: "The urgency, life moment or trigger that pushes them to call you.",
    },
    desire_success_vision: {
      placeholder: "Example: A trusted local pro on speed-dial, work done right the first time, peace of mind at home, and someone they happily refer to neighbors.",
      helper: "Practical service result + emotional relief + lifestyle ease + loyalty identity.",
    },
    transformation_process: {
      placeholder: "Example: Friendly first call → fast on-site quote → quality install → follow-up check-in → annual maintenance plan.",
      helper: "Your end-to-end customer experience that turns first-timers into loyal locals.",
    },
    avatar_niche: {
      placeholder: "Example: Reliable residential HVAC service for homeowners in [your city].",
      helper: "Service + audience + region. Specific wins locally.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter… (e.g. trust-driven, busy, review-conscious)",
      helper: "Values, communication style and what builds trust.",
    },
    avatar_not_fit: {
      placeholder: "Example: Price-shoppers outside the service area, one-time emergency-only callers who never return.",
    },
    pain_main_problem: {
      placeholder: "Example: They need a trusted local pro fast and don't want to gamble on a no-name from Google Maps.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: Calls not returned, vague quotes, technicians late or rude, mediocre work that needs redoing.",
    },
    pain_blockers: {
      placeholder: "Example: Hard to vet local businesses, fear of being upsold, unclear pricing, scheduling friction.",
    },
    pain_already_tried: {
      placeholder: "Example: Asking neighbors, scrolling Google reviews, calling the cheapest option from a flyer.",
    },
    pain_why_failed: {
      placeholder: "Example: Inconsistent quality, hidden fees, slow response times, no follow-up after the job.",
    },
    pain_consequences: {
      placeholder: "Example: Recurring problems, money wasted on bad work, stress in their home or business.",
    },
    desire_main_result: {
      placeholder: "Example: One trusted local pro they can call any time and know the job will be done right.",
    },
    desire_dream_scenario: {
      placeholder: "Example: Quick scheduling, clear pricing, friendly staff, work done right the first time — every time.",
    },
    desire_emotional_change: {
      placeholder: "Example: Relief, trust, the calm of knowing they finally found 'the' provider.",
    },
    desire_lifestyle: {
      placeholder: "Example: A home that runs smoothly, less stress, a provider they happily refer to neighbors.",
    },
    desire_why_badly: {
      placeholder: "Example: To stop worrying about which provider to call and just have it handled.",
    },
    transformation_point_a: {
      placeholder: "Example: Frustrated, unsure who to trust, juggling multiple providers with mixed results.",
    },
    transformation_point_b: {
      placeholder: "Example: One go-to local pro, scheduled service, peace of mind, recommending you to friends.",
    },
    transformation_external: {
      placeholder: "Example: Bookings on their calendar, reviews left, repeat visits, referrals to neighbors.",
    },
    transformation_internal: {
      placeholder: "Example: Trust, relief, loyalty to your brand.",
    },
    transformation_possible: {
      placeholder: "Example: Becoming a long-term customer, referring friends, choosing premium service plans.",
    },
  },

  other: {
    avatar_who: {
      placeholder: "Example: A specific group with a clear, urgent problem you've solved repeatedly.",
      helper: "Be specific — situation, identity, stage, urgency.",
    },
    avatar_type: { helper: "Pick the closest match for what you do." },
    avatar_stage: {
      placeholder: "Example: A specific life or business moment that makes solving this urgent for them right now.",
      helper: "The situation, life stage or trigger that brings them to you.",
    },
    desire_success_vision: {
      placeholder: "Example: The full picture of what their life or business looks and feels like once they have what they want.",
      helper: "Combine outcome, emotion, lifestyle and identity into one vivid picture.",
    },
    transformation_process: {
      placeholder: "Example: Step 1 → Step 2 → Step 3 → outcome. The clear journey you guide them through.",
      helper: "The method, framework or process that bridges current state and desired state.",
    },
    avatar_niche: {
      placeholder: "Example: Be specific — who you serve and the result you deliver.",
    },
    avatar_traits: {
      placeholder: "Type a trait and press Enter…",
      helper: "Mindset, identity markers, values that define them.",
    },
    avatar_not_fit: {
      placeholder: "Example: People who aren't ready, unwilling to do the work, or expecting overnight results.",
    },
    pain_main_problem: {
      placeholder: "Example: The dominant problem they face and can't solve on their own.",
    },
    pain_daily_frustrations: {
      placeholder: "Example: The recurring frustrations that show up week after week.",
    },
    pain_blockers: {
      placeholder: "Example: What's stopping them from getting unstuck — internal or external.",
    },
    pain_already_tried: {
      placeholder: "Example: Different methods, courses, or providers without lasting results.",
    },
    pain_why_failed: {
      placeholder: "Example: No personalized strategy, wrong fit, inconsistent execution.",
    },
    pain_consequences: {
      placeholder: "Example: What's at stake if they do nothing — practically and emotionally.",
      helper: "Both practical and emotional consequences.",
    },
    desire_main_result: {
      placeholder: "Example: The clear, measurable result you help them achieve.",
    },
    desire_dream_scenario: {
      placeholder: "Example: What their life or business looks like once they have what they want.",
    },
    desire_emotional_change: {
      placeholder: "Example: Confidence, calm, pride, freedom, certainty.",
    },
    desire_lifestyle: {
      placeholder: "Example: The identity, status or lifestyle they want to step into.",
    },
    desire_why_badly: {
      placeholder: "Example: The deeper reason this matters to them — beyond the surface goal.",
      helper: "Dig deeper than surface-level goals.",
    },
    transformation_point_a: {
      placeholder: "Example: Where they are today — pain, situation, identity.",
      helper: "Their pain, situation and identity today.",
    },
    transformation_point_b: {
      placeholder: "Example: Where they want to be — outcome, situation, new identity.",
      helper: "Their outcome, situation and new identity.",
    },
    transformation_external: {
      placeholder: "Example: The visible, measurable changes they'll experience.",
    },
    transformation_internal: {
      placeholder: "Example: The internal shifts in identity, confidence and mindset.",
    },
    transformation_possible: {
      placeholder: "Example: New doors that open once they reach the result.",
    },
  },
};

export function getFieldCopy(
  businessTypeId: BusinessTypeId | string | null | undefined,
  fieldKey: keyof CustomerClarityData,
): FieldCopy {
  const id = (businessTypeId && businessTypeId in CLARITY_COPY ? businessTypeId : "coach") as BusinessTypeId;
  return CLARITY_COPY[id]?.[fieldKey] ?? CLARITY_COPY.coach[fieldKey] ?? {};
}
