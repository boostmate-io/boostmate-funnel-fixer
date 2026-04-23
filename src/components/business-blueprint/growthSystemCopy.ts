/**
 * Per-business-type micro-copy for every Growth System field.
 * Drives placeholders + helper text so each tab feels native to the user's business model.
 */
import type { BusinessTypeId } from "./businessTypes";
import type { GrowthSystemData } from "./growthSystemTypes";

export interface FieldCopy {
  placeholder?: string;
  helper?: string;
}

export type GrowthFieldCopy = Partial<Record<keyof GrowthSystemData, FieldCopy>>;

export const GROWTH_SYSTEM_COPY: Record<BusinessTypeId, GrowthFieldCopy> = {
  coach: {
    traffic_primary_source: {
      placeholder: "Example: Organic Instagram + Reels — daily content built around 3 client transformation themes.",
    },
    traffic_secondary_source: {
      placeholder: "Example: Podcast guest appearances + collaborations with adjacent coaches.",
    },
    traffic_best_performing: {
      placeholder: "Example: Reels about identity rewrites — 2 of them brought 60% of last month's calls.",
    },
    traffic_bottleneck: {
      placeholder: "Example: Reach is fine but content rarely converts to DMs or call bookings.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free 'Confident Self' starter audio → email nurture → discovery call.",
    },
    funnel_low_ticket: {
      placeholder: "Example: €47 mini-course funnel with order bump to a 1:1 strategy session.",
    },
    funnel_core_offer: {
      placeholder: "Example: Application page → discovery call → enrollment in 90-day program.",
    },
    funnel_application: {
      placeholder: "Example: Long-form application form filtering for income, commitment and readiness.",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: 45-min live workshop monthly → call booking → enrollment.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: No retargeting funnel for non-converters; no alumni continuity funnel.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: 1:1 discovery calls with a structured close framework.",
    },
    conversion_followup_process: {
      placeholder: "Example: 7-touch follow-up: 24h voice note → day 3 case study → day 7 final invite.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: 3–10 days from first call to enrollment.",
    },
    conversion_bottleneck: {
      placeholder: "Example: Calls feel inspiring but convert below 25% — pricing objection at the close.",
    },
    nurture_email: {
      placeholder: "Example: 7-day welcome sequence + weekly story-driven email with one CTA.",
    },
    nurture_retargeting: {
      placeholder: "Example: Meta retargeting on call-page visitors with 3 testimonial reels.",
    },
    nurture_organic_content: {
      placeholder: "Example: 4 reels/week — 1 myth-bust, 1 transformation, 1 method, 1 personal.",
    },
    nurture_dm_followup: {
      placeholder: "Example: Voice-note DMs to anyone who saves a Reel + a curiosity question.",
    },
    nurture_community: {
      placeholder: "Example: Free Telegram channel with weekly mini-lessons and live Q&A.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: No long-term nurture for people who aren't ready to buy yet.",
    },
    ascension_entry_point: {
      placeholder: "Example: Free starter audio + 5-day rebuild challenge.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: €47 mini-course as proof-of-buyer step before 1:1 program.",
    },
    ascension_premium_path: {
      placeholder: "Example: 12-month mastermind with 4 retreats for graduated clients.",
    },
    ascension_retention_path: {
      placeholder: "Example: Alumni community at €197/mo with monthly group call.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: No backend retention offer — clients finish the program and leave the ecosystem.",
    },
  },

  agency: {
    traffic_primary_source: {
      placeholder: "Example: Cold outbound (email + LinkedIn) targeting B2B SaaS founders $50–250k MRR.",
    },
    traffic_secondary_source: {
      placeholder: "Example: Niche case-study LinkedIn content + podcast appearances.",
    },
    traffic_best_performing: {
      placeholder: "Example: 3-step LinkedIn cold email sequence — 12% reply rate, 4% booked.",
    },
    traffic_bottleneck: {
      placeholder: "Example: Reply rate is fine but show-up rate to discovery calls is only 50%.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free SaaS funnel audit + competitor ad teardown delivered as Loom.",
    },
    funnel_low_ticket: {
      placeholder: "Example: $1,500 paid pilot diagnostic with 90-day roadmap deliverable.",
    },
    funnel_core_offer: {
      placeholder: "Example: Outbound → call → proposal → 6-month $7.5k/mo retainer.",
    },
    funnel_application: {
      placeholder: "Example: Application form with MRR, ad spend and current channels — auto-disqualifies under $20k MRR.",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: VSL on landing page walking through the SaaS Pipeline Engine method.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: No nurture funnel for unqualified leads; no upsell funnel for current retainers.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: Discovery call → proposal call with custom roadmap → contract.",
    },
    conversion_followup_process: {
      placeholder: "Example: 9-touch follow-up over 14 days: 24h recap, day 3 case study, day 7 ROI calculator, day 14 final call.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: 14–30 days from first call to signed contract.",
    },
    conversion_bottleneck: {
      placeholder: "Example: Proposals get reviewed but champion can't sell internally — no enablement assets.",
    },
    nurture_email: {
      placeholder: "Example: Weekly newsletter with one tactical breakdown + one client win.",
    },
    nurture_retargeting: {
      placeholder: "Example: LinkedIn retargeting on case-study video viewers.",
    },
    nurture_organic_content: {
      placeholder: "Example: 3 LinkedIn posts/week — 1 contrarian take, 1 case study, 1 framework.",
    },
    nurture_dm_followup: {
      placeholder: "Example: Personalized voice notes to engaged comments + 2-touch booking sequence.",
    },
    nurture_community: {
      placeholder: "Example: Quarterly invite-only roundtable for SaaS founders in our ICP.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: No long-term nurture for prospects not ready to buy in the next 90 days.",
    },
    ascension_entry_point: {
      placeholder: "Example: Free audit → $1,500 pilot diagnostic.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: From pilot diagnostic into $7.5k/mo retainer.",
    },
    ascension_premium_path: {
      placeholder: "Example: $25k quarterly strategic engagement + on-site workshop for top retainers.",
    },
    ascension_retention_path: {
      placeholder: "Example: $2k/mo light retention plan for graduated clients to stay in ecosystem.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: No backend offers once retainer ends — clients churn out completely.",
    },
  },

  consultant: {
    traffic_primary_source: {
      placeholder: "Example: Targeted outbound to VPs of Growth at SaaS companies $5–30M ARR.",
    },
    traffic_secondary_source: {
      placeholder: "Example: Speaking at 2 industry events / quarter + podcast guesting.",
    },
    traffic_best_performing: {
      placeholder: "Example: Warm intros from past engagements convert at 60% to discovery call.",
    },
    traffic_bottleneck: {
      placeholder: "Example: Outbound works but is slow — no inbound demand engine.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free 30-min strategic audit call + custom diagnostic preview.",
    },
    funnel_low_ticket: {
      placeholder: "Example: $2,500 paid diagnostic workshop with leadership team.",
    },
    funnel_core_offer: {
      placeholder: "Example: Audit → diagnostic → 90-day Growth Operating System engagement.",
    },
    funnel_application: {
      placeholder: "Example: Pre-call form qualifying ARR, growth stage and decision authority.",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: Quarterly executive masterclass walking through the framework.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: No content engine to nurture VPs over 6–12 months until trigger event.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: 2-call structure — discovery + proposal walkthrough with leadership.",
    },
    conversion_followup_process: {
      placeholder: "Example: Recap doc within 24h, decision-maker sync at day 7, final ROI walkthrough at day 14.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: 30–60 days due to multi-stakeholder decisions.",
    },
    conversion_bottleneck: {
      placeholder: "Example: Decisions stall in committee — need stronger executive enablement assets.",
    },
    nurture_email: {
      placeholder: "Example: Monthly executive briefing with one trend + one framework + one case.",
    },
    nurture_retargeting: {
      placeholder: "Example: LinkedIn ads retargeting podcast listeners + newsletter readers.",
    },
    nurture_organic_content: {
      placeholder: "Example: Long-form essays + 2 LinkedIn posts/week on growth strategy.",
    },
    nurture_dm_followup: {
      placeholder: "Example: Personal LinkedIn DMs to engaged execs after a content milestone.",
    },
    nurture_community: {
      placeholder: "Example: Quarterly private roundtable for current + prospective clients.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: No long-term nurture system for executives 6–12 months from a trigger event.",
    },
    ascension_entry_point: {
      placeholder: "Example: Free strategic audit call.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: Paid $2,500 diagnostic workshop as proof-of-buyer step.",
    },
    ascension_premium_path: {
      placeholder: "Example: $100k annual fractional CXO advisory for top engagements.",
    },
    ascension_retention_path: {
      placeholder: "Example: $8k/mo ongoing advisory retainer post-engagement.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: No productized backend offer — every renewal is a new bespoke proposal.",
    },
  },

  "course-creator": {
    traffic_primary_source: {
      placeholder: "Example: Long-form YouTube content optimized for search + binge-watching.",
    },
    traffic_secondary_source: {
      placeholder: "Example: Paid ads to free workshop + email list growth via lead magnets.",
    },
    traffic_best_performing: {
      placeholder: "Example: 3 evergreen YouTube videos drive 70% of email subscribers.",
    },
    traffic_bottleneck: {
      placeholder: "Example: Email list grows but conversion to course is below 2%.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free 5-day 'Portfolio in a Week' challenge with daily emails.",
    },
    funnel_low_ticket: {
      placeholder: "Example: $97 'First Outreach Toolkit' tripwire on thank-you page.",
    },
    funnel_core_offer: {
      placeholder: "Example: Workshop → email sequence → cohort enrollment funnel.",
    },
    funnel_application: {
      placeholder: "Example: Application page for $5k 1:1 mentorship intensive.",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: Live monthly workshop with course pitch at the end.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: No evergreen funnel — only launches; no continuity offer for graduates.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: Checkout page after live workshop close + 72h cart open.",
    },
    conversion_followup_process: {
      placeholder: "Example: 5-email cart sequence + 2 SMS reminders + final-hour live Q&A.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: 7–14 days from workshop attendance to enrollment.",
    },
    conversion_bottleneck: {
      placeholder: "Example: Cart conversion strong but only 8% of email list ever attends a workshop.",
    },
    nurture_email: {
      placeholder: "Example: Weekly newsletter with 1 tactical lesson + 1 student win.",
    },
    nurture_retargeting: {
      placeholder: "Example: YouTube retargeting on workshop opt-in page visitors.",
    },
    nurture_organic_content: {
      placeholder: "Example: 1 long YouTube/week + 3 short-form clips/week on TikTok + IG.",
    },
    nurture_dm_followup: {
      placeholder: "Example: Auto-DM to commenters with link to free challenge opt-in.",
    },
    nurture_community: {
      placeholder: "Example: Free Discord with weekly office hours for free-content audience.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: No long-term nurture for the 92% of subscribers who don't attend workshops.",
    },
    ascension_entry_point: {
      placeholder: "Example: Free 5-day challenge.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: $97 toolkit → $1,500 cohort enrollment.",
    },
    ascension_premium_path: {
      placeholder: "Example: $5k 1:1 mentorship intensive over 6 months.",
    },
    ascension_retention_path: {
      placeholder: "Example: $47/mo alumni community + monthly live calls.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: No tier between free and $1.5k course — too big a leap for warm leads.",
    },
  },

  ecommerce: {
    traffic_primary_source: {
      placeholder: "Example: Paid social — Meta + TikTok ads driving to product pages and quiz funnels.",
    },
    traffic_secondary_source: {
      placeholder: "Example: Influencer / UGC partnerships + organic IG content.",
    },
    traffic_best_performing: {
      placeholder: "Example: Skin quiz funnel — 3.2x ROAS vs 1.8x for direct PDP traffic.",
    },
    traffic_bottleneck: {
      placeholder: "Example: ROAS dropping as we scale; first-time buyer CAC up 40% YoY.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free 2-min skin quiz with personalized routine recommendation.",
    },
    funnel_low_ticket: {
      placeholder: "Example: €19 travel-size 'Glow Trial Kit' as first-buyer entry product.",
    },
    funnel_core_offer: {
      placeholder: "Example: Quiz → personalized PDP → bundle upsell at checkout.",
    },
    funnel_application: {
      placeholder: "Example: Not applicable — direct ecom path.",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: 90-second product VSL on collection page + ad creative.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: No subscription funnel; no bundle upsell sequence post-purchase.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: Standard ecom checkout with 1-click upsell + abandoned cart recovery.",
    },
    conversion_followup_process: {
      placeholder: "Example: 3-email + 2-SMS abandoned cart sequence over 72h.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: Same-session purchase or 1–7 days via email/SMS recovery.",
    },
    conversion_bottleneck: {
      placeholder: "Example: Cart abandonment at 75% — high mobile drop-off at shipping step.",
    },
    nurture_email: {
      placeholder: "Example: Welcome flow + weekly newsletter with skin tips and product education.",
    },
    nurture_retargeting: {
      placeholder: "Example: Meta dynamic product ads + TikTok creator UGC retargeting.",
    },
    nurture_organic_content: {
      placeholder: "Example: 4 IG reels/week — routines, ingredients, before/afters, founder content.",
    },
    nurture_dm_followup: {
      placeholder: "Example: Auto-DM responses on product questions + concierge upgrade offer.",
    },
    nurture_community: {
      placeholder: "Example: Brand community on IG broadcast channel + ambassador program.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: No post-purchase nurture beyond the order confirmation.",
    },
    ascension_entry_point: {
      placeholder: "Example: Free skin quiz → first-purchase discount.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: From €19 trial kit to €89 full Glow System bundle.",
    },
    ascension_premium_path: {
      placeholder: "Example: €149 Pro Glow Kit + concierge skin consult.",
    },
    ascension_retention_path: {
      placeholder: "Example: Auto-replenish subscription every 60 days at 15% off.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: Repeat purchase rate stuck at 18% — no real subscription program in market.",
    },
  },

  "local-business": {
    traffic_primary_source: {
      placeholder: "Example: Google Business Profile + local SEO + review generation.",
    },
    traffic_secondary_source: {
      placeholder: "Example: Geo-targeted Meta ads + local community partnerships.",
    },
    traffic_best_performing: {
      placeholder: "Example: GBP optimization — 40% of bookings come from 'near me' searches.",
    },
    traffic_bottleneck: {
      placeholder: "Example: Seasonal swings — Q1 bookings drop 40% from Q4.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free in-home estimate or phone diagnostic.",
    },
    funnel_low_ticket: {
      placeholder: "Example: $99 first-visit special / diagnostic fee.",
    },
    funnel_core_offer: {
      placeholder: "Example: Call → quote → service → follow-up → annual maintenance plan.",
    },
    funnel_application: {
      placeholder: "Example: Not applicable — booking form-driven.",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: Short explainer videos on landing pages by service type.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: No referral funnel; no win-back sequence for past customers.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: Phone call → in-home quote → flat-rate proposal → booking.",
    },
    conversion_followup_process: {
      placeholder: "Example: 24h SMS recap + 3-day follow-up call + 7-day final email.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: Same-day to 7 days for most repairs; 14–30 days for replacements.",
    },
    conversion_bottleneck: {
      placeholder: "Example: Quote-to-close rate is only 45% — losing on price without anchoring.",
    },
    nurture_email: {
      placeholder: "Example: Quarterly maintenance reminder + seasonal tip newsletter.",
    },
    nurture_retargeting: {
      placeholder: "Example: Meta retargeting on quote-page visitors + pricing-page visitors.",
    },
    nurture_organic_content: {
      placeholder: "Example: Weekly local FB posts + before/after photos + customer reviews.",
    },
    nurture_dm_followup: {
      placeholder: "Example: SMS follow-up after every job + review request 48h after completion.",
    },
    nurture_community: {
      placeholder: "Example: Local FB community sponsorship + neighborhood event presence.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: No system to stay top-of-mind between service calls — past customers forget us.",
    },
    ascension_entry_point: {
      placeholder: "Example: Free phone diagnostic or in-home estimate.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: From service call to Comfort Club annual maintenance plan.",
    },
    ascension_premium_path: {
      placeholder: "Example: Premium full-system replacement package with 10-yr warranty.",
    },
    ascension_retention_path: {
      placeholder: "Example: $19/mo Comfort Club: 2 tune-ups/yr + priority booking + 15% off repairs.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: One-and-done customers — no recurring revenue stream from past jobs.",
    },
  },

  other: {
    traffic_primary_source: {
      placeholder: "Example: The main channel where strangers discover your business today.",
    },
    traffic_secondary_source: {
      placeholder: "Example: A second supporting channel that brings additional traffic.",
    },
    traffic_best_performing: {
      placeholder: "Example: Which traffic source converts highest right now.",
    },
    traffic_bottleneck: {
      placeholder: "Example: Where traffic is breaking down — reach, quality, cost or consistency.",
    },
    funnel_free_offer: {
      placeholder: "Example: Free entry point that captures contact + nurtures into your ecosystem.",
    },
    funnel_low_ticket: {
      placeholder: "Example: Low-priced first purchase that turns leads into buyers.",
    },
    funnel_core_offer: {
      placeholder: "Example: The funnel that drives your main offer enrollment.",
    },
    funnel_application: {
      placeholder: "Example: A qualifying form for high-ticket offers (optional).",
    },
    funnel_webinar_vsl: {
      placeholder: "Example: Webinar / VSL funnel that warms cold traffic into buyers.",
    },
    funnel_missing_opportunities: {
      placeholder: "Example: Funnels you know you need but haven't built yet.",
    },
    conversion_primary_mechanism: {
      placeholder: "Example: How leads actually become buyers in your business.",
    },
    conversion_followup_process: {
      placeholder: "Example: Your structured follow-up sequence after first contact.",
    },
    conversion_sales_cycle: {
      placeholder: "Example: Average time from first touch to purchase.",
    },
    conversion_bottleneck: {
      placeholder: "Example: The main reason leads don't become buyers.",
    },
    nurture_email: {
      placeholder: "Example: Your email nurture rhythm for warm leads.",
    },
    nurture_retargeting: {
      placeholder: "Example: Paid retargeting across the channels your audience uses.",
    },
    nurture_organic_content: {
      placeholder: "Example: Your organic content cadence and core themes.",
    },
    nurture_dm_followup: {
      placeholder: "Example: Personal DM follow-up with engaged audience members.",
    },
    nurture_community: {
      placeholder: "Example: Community space (free or paid) where trust is built.",
    },
    nurture_biggest_gap: {
      placeholder: "Example: The trust-building system you're missing today.",
    },
    ascension_entry_point: {
      placeholder: "Example: Pre-filled from your free offer in Offer Design.",
    },
    ascension_next_upgrade: {
      placeholder: "Example: The natural next purchase after the entry offer.",
    },
    ascension_premium_path: {
      placeholder: "Example: Premium tier for your top customers.",
    },
    ascension_retention_path: {
      placeholder: "Example: Recurring offer that retains buyers long-term.",
    },
    ascension_monetization_gap: {
      placeholder: "Example: Where revenue is leaking from your customer journey.",
    },
  },
};

export function getGrowthFieldCopy(
  businessTypeId: BusinessTypeId,
  field: keyof GrowthSystemData,
): FieldCopy {
  return GROWTH_SYSTEM_COPY[businessTypeId]?.[field] ?? {};
}
