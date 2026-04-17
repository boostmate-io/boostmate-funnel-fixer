import {
  GraduationCap,
  Briefcase,
  Lightbulb,
  PlayCircle,
  ShoppingBag,
  Store,
  Layers,
  type LucideIcon,
} from "lucide-react";

export type BusinessTypeId =
  | "coach"
  | "agency"
  | "consultant"
  | "course-creator"
  | "ecommerce"
  | "local-business"
  | "other";

export interface BusinessTypeDef {
  id: BusinessTypeId;
  label: string;
  icon: LucideIcon;
  shortDescription: string;
  /** Audience noun, e.g. "clients", "customers" */
  customerNoun: string;
  customerNounSingular: string;
  /** Result noun, e.g. "transformation", "ROI" */
  outcomeNoun: string;
  /** Vocabulary tags AI + chips can pull from */
  vocabulary: string[];
  /** Example avatar suggestion */
  exampleAvatar: string;
  /** Example main pain */
  examplePain: string;
  /** Example desired result */
  exampleResult: string;
  /** Example transformation Point B */
  exampleTransformation: string;
  /** Example "not a fit" */
  exampleNotFit: string;
  /** Common stages for this business model */
  stageOptions: { value: string; label: string }[];
  /** Niche / sub-type options shown as chips (e.g. Fitness Coach, Mindset Coach) */
  nicheOptions: { value: string; label: string }[];
  /** Avatar examples surfaced as placeholders / inspiration */
  avatarExamples: string[];
  /** Daily frustration example placeholder */
  exampleDailyFrustration: string;
  /** Dream scenario example placeholder */
  exampleDreamScenario: string;
  /** Niche/market example placeholder */
  exampleNicheMarket: string;
  /** Point A example placeholder */
  examplePointA: string;
  /** What changes externally example */
  exampleExternal: string;
  /** Common offer types for this business model */
  offerExamples: string[];
  /** Common growth channels */
  growthExamples: string[];
  /** Common brand positioning angles */
  brandExamples: string[];
  /** Common proof formats */
  proofExamples: string[];
}

export const BUSINESS_TYPES: Record<BusinessTypeId, BusinessTypeDef> = {
  coach: {
    id: "coach",
    label: "Coach",
    icon: GraduationCap,
    shortDescription: "1:1 or group coaching for transformation, results or healing.",
    customerNoun: "clients",
    customerNounSingular: "client",
    outcomeNoun: "transformation",
    vocabulary: [
      "clients", "transformation", "confidence", "purpose", "breakthrough",
      "mindset", "results", "calls", "container", "1:1", "group program",
    ],
    exampleAvatar: "Solo fitness coaches stuck at €3k/month who need predictable client flow",
    examplePain: "Inconsistent client bookings, relying on referrals, no scalable system",
    exampleResult: "Sign 5 new high-ticket clients per month on autopilot",
    exampleTransformation: "Coach at €15k/month with a system that books 15+ calls monthly, calm and in demand",
    exampleNotFit: "People wanting overnight results or unwilling to do the inner work",
    stageOptions: [
      { value: "starting", label: "Just starting" },
      { value: "growing", label: "Growing (3–10k/mo)" },
      { value: "established", label: "Established (10–25k/mo)" },
      { value: "scaling", label: "Scaling (25k+/mo)" },
    ],
    nicheOptions: [
      { value: "mindset", label: "Mindset Coach" },
      { value: "life", label: "Life Coach" },
      { value: "fitness", label: "Fitness Coach" },
      { value: "health", label: "Health & Nutrition" },
      { value: "relationship", label: "Relationship Coach" },
      { value: "spiritual", label: "Spiritual Coach" },
      { value: "business", label: "Business Coach" },
      { value: "career", label: "Career Coach" },
      { value: "performance", label: "Performance Coach" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "Women rebuilding confidence after toxic relationships",
      "Busy men 35–50 wanting to lose weight and regain energy",
      "Couples struggling with trust and communication",
      "Professionals seeking clarity and purpose in their career",
      "High-achievers stuck in burnout looking to reconnect with themselves",
    ],
    exampleDailyFrustration:
      "Posting content with no engagement, doing free calls that never convert, second-guessing their pricing.",
    exampleDreamScenario:
      "Waking up to discovery calls booked, signing dream clients each week, and finally feeling like a respected expert.",
    exampleNicheMarket:
      "Transformational coaching for women rebuilding confidence and self-worth.",
    examplePointA:
      "Solo coach at €3k/month, posting content with little engagement, no consistent client flow, and quietly anxious about next month's income.",
    exampleExternal:
      "Predictable client bookings, premium pricing, recognized authority in their niche.",
    offerExamples: [
      "Free discovery call / lead magnet",
      "Low-ticket masterclass or mini-course",
      "Signature 1:1 coaching program",
      "Premium mastermind / group container",
    ],
    growthExamples: [
      "Organic content (Instagram / LinkedIn)",
      "DM outreach to ideal clients",
      "Webinar → 1:1 call funnel",
      "Paid ads → lead magnet → call",
    ],
    brandExamples: [
      "Authority coach (results-focused)",
      "Heart-led transformational coach",
      "Methodology-driven expert",
    ],
    proofExamples: [
      "Client transformation stories",
      "Before/after results",
      "Testimonial videos",
      "Featured in / podcast appearances",
    ],
  },
  agency: {
    id: "agency",
    label: "Agency",
    icon: Briefcase,
    shortDescription: "Done-for-you services delivered to businesses on retainer or project.",
    customerNoun: "clients",
    customerNounSingular: "client",
    outcomeNoun: "ROI",
    vocabulary: [
      "clients", "leads", "retainers", "MRR", "service delivery", "niche",
      "case studies", "pipeline", "qualified leads", "fulfillment",
    ],
    exampleAvatar: "B2B SaaS founders doing $50k–250k MRR who need a paid ads agency that ships fast",
    examplePain: "Burning ad spend with no clear attribution, churning agencies, unclear ROI",
    exampleResult: "Sign 3 new $5k/mo retainer clients per month with predictable delivery",
    exampleTransformation: "Agency at $50k MRR with 80% retention, repeatable case studies, hires onboarded",
    exampleNotFit: "Tire-kickers under $20k MRR or businesses without product-market fit",
    stageOptions: [
      { value: "freelancer", label: "Freelancer / solo" },
      { value: "small", label: "Small agency (1–5 staff)" },
      { value: "growing", label: "Growing (10k–50k MRR)" },
      { value: "scaling", label: "Scaling (50k+ MRR)" },
    ],
    nicheOptions: [
      { value: "paid-ads", label: "Paid Ads Agency" },
      { value: "seo", label: "SEO Agency" },
      { value: "social", label: "Social Media Agency" },
      { value: "web-design", label: "Web / Funnel Design" },
      { value: "content", label: "Content / Video Agency" },
      { value: "outreach", label: "B2B Outreach Agency" },
      { value: "ecommerce", label: "Ecommerce Growth" },
      { value: "full-service", label: "Full-service Marketing" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "B2B SaaS founders doing $50k–250k MRR who need predictable lead gen",
      "DTC brands at $50k/mo wanting to scale paid ads profitably",
      "Coaches & consultants who need a high-converting funnel",
      "Local service businesses wanting consistent inbound leads",
    ],
    exampleDailyFrustration: "Burning ad spend with no clear ROI, churning agencies, unclear attribution, missed reporting deadlines.",
    exampleDreamScenario: "A predictable pipeline of qualified retainer clients with case studies that close deals on autopilot.",
    exampleNicheMarket: "Paid acquisition for B2B SaaS in the $50–250k MRR range.",
    examplePointA: "Agency at $20k MRR, project-based work, inconsistent referrals, no clear niche.",
    exampleExternal: "MRR, retention rate, team size, recognized authority in their vertical.",
    offerExamples: [
      "Free audit / strategy session",
      "Setup or pilot project",
      "Monthly retainer (core service)",
      "Premium done-with-you / consulting",
    ],
    growthExamples: [
      "Cold outbound (email + LinkedIn)",
      "Niche case-study marketing",
      "Referral partnerships",
      "Paid traffic → VSL → call",
    ],
    brandExamples: [
      "Vertical specialist (one niche)",
      "Performance-driven (we get results)",
      "Premium boutique partner",
    ],
    proofExamples: [
      "Detailed case studies with metrics",
      "Client logos & testimonials",
      "ROI / revenue benchmarks",
      "Industry awards or partnerships",
    ],
  },
  consultant: {
    id: "consultant",
    label: "Consultant",
    icon: Lightbulb,
    shortDescription: "Strategic advisory and expertise sold to businesses or executives.",
    customerNoun: "clients",
    customerNounSingular: "client",
    outcomeNoun: "strategic clarity",
    vocabulary: [
      "clients", "strategy", "advisory", "engagement", "deliverables",
      "stakeholders", "ROI", "transformation", "frameworks",
    ],
    exampleAvatar: "VP-level execs at scaling SaaS companies who need an outside operator's perspective",
    examplePain: "Internal teams stuck in execution; no clear strategic roadmap or prioritization",
    exampleResult: "Sign 2 new $15k+ engagements per quarter with a productized advisory offer",
    exampleTransformation: "Consultancy with a recognizable framework, predictable pipeline, and 6-figure engagements",
    exampleNotFit: "Companies seeking the cheapest option or unable to act on recommendations",
    stageOptions: [
      { value: "independent", label: "Independent" },
      { value: "boutique", label: "Boutique practice" },
      { value: "established", label: "Established firm" },
      { value: "scaling", label: "Scaling / productized" },
    ],
    nicheOptions: [
      { value: "strategy", label: "Strategy Consultant" },
      { value: "operations", label: "Operations Consultant" },
      { value: "marketing", label: "Marketing Consultant" },
      { value: "sales", label: "Sales Consultant" },
      { value: "finance", label: "Finance / FP&A" },
      { value: "tech", label: "Technology Consultant" },
      { value: "hr", label: "People / HR Consultant" },
      { value: "fractional", label: "Fractional Executive" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "VP-level execs at scaling SaaS companies needing an outside operator's view",
      "Founders of $5–30M businesses wanting a clear growth roadmap",
      "PE-backed portfolio companies needing rapid operational improvements",
    ],
    exampleDailyFrustration: "Internal teams stuck firefighting, no strategic clarity, conflicting priorities from leadership.",
    exampleDreamScenario: "A clear roadmap, aligned leadership team, and visible progress on the metrics that matter most.",
    exampleNicheMarket: "Growth strategy for B2B SaaS companies between $5–30M ARR.",
    examplePointA: "Independent consultant at $10k/mo per engagement, custom proposals, unpredictable pipeline.",
    exampleExternal: "Recurring engagements, productized offer, recognized framework, premium pricing.",
    offerExamples: [
      "Free strategy diagnostic",
      "Paid audit / workshop",
      "Core advisory engagement",
      "Premium fractional / retainer",
    ],
    growthExamples: [
      "Thought leadership content",
      "Speaking & podcast appearances",
      "Warm intros & referrals",
      "Targeted outbound to executives",
    ],
    brandExamples: [
      "Recognized industry expert",
      "Framework / methodology owner",
      "Boutique strategic partner",
    ],
    proofExamples: [
      "Named client engagements",
      "Published frameworks / books",
      "Speaking credentials",
      "Executive testimonials",
    ],
  },
  "course-creator": {
    id: "course-creator",
    label: "Course Creator",
    icon: PlayCircle,
    shortDescription: "Online courses, cohorts, and digital products at scale.",
    customerNoun: "students",
    customerNounSingular: "student",
    outcomeNoun: "skill gain",
    vocabulary: [
      "students", "course", "cohort", "modules", "completion",
      "launch", "evergreen", "community", "outcome",
    ],
    exampleAvatar: "Aspiring freelance designers who want to land their first $3k/mo client",
    examplePain: "Drowning in tutorials, no clear path, can't land paying clients",
    exampleResult: "Launch evergreen course doing $50k/mo with strong student outcomes",
    exampleTransformation: "Course brand at $50k/mo with 80% completion rate and a thriving alumni community",
    exampleNotFit: "Buyers looking for shortcuts who won't do the work",
    stageOptions: [
      { value: "first-launch", label: "First launch" },
      { value: "iterating", label: "Iterating (5–25k/launch)" },
      { value: "evergreen", label: "Evergreen funnel" },
      { value: "scaling", label: "Scaling (50k+/mo)" },
    ],
    nicheOptions: [
      { value: "career", label: "Career / Skills" },
      { value: "creative", label: "Creative / Design" },
      { value: "tech", label: "Tech / No-code / Dev" },
      { value: "business", label: "Business / Marketing" },
      { value: "language", label: "Language" },
      { value: "health", label: "Health & Fitness" },
      { value: "personal-dev", label: "Personal Development" },
      { value: "academic", label: "Academic / Test Prep" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "Aspiring freelance designers wanting their first $3k/mo client",
      "Career-switchers learning a new skill to land a better job",
      "Solopreneurs wanting a step-by-step playbook to launch faster",
    ],
    exampleDailyFrustration: "Drowning in free tutorials, jumping between courses, never finishing what they start.",
    exampleDreamScenario: "Completing the program, getting a real outcome, and joining a community of peers achieving the same.",
    exampleNicheMarket: "Step-by-step program for aspiring freelance designers.",
    examplePointA: "First launch at $5k revenue, low completion rate, manual delivery, no nurture sequence.",
    exampleExternal: "Monthly recurring revenue, completion rates, student outcomes, community size.",
    offerExamples: [
      "Free workshop / lead magnet",
      "Tripwire mini-course",
      "Flagship course / cohort",
      "Premium mastermind / community",
    ],
    growthExamples: [
      "YouTube / long-form content",
      "Webinar → course funnel",
      "Email list nurture",
      "Paid ads → workshop → course",
    ],
    brandExamples: [
      "Outcome-focused educator",
      "Community-driven cohort host",
      "Authority creator with signature method",
    ],
    proofExamples: [
      "Student win screenshots",
      "Completion & outcome stats",
      "Video testimonials",
      "Alumni network strength",
    ],
  },
  ecommerce: {
    id: "ecommerce",
    label: "Ecommerce",
    icon: ShoppingBag,
    shortDescription: "Physical or digital products sold direct to consumers.",
    customerNoun: "customers",
    customerNounSingular: "customer",
    outcomeNoun: "AOV / LTV",
    vocabulary: [
      "customers", "products", "AOV", "LTV", "repeat purchase",
      "store conversion", "ROAS", "abandoned cart", "retention",
    ],
    exampleAvatar: "Eco-conscious women 28–45 buying premium skincare who value clean ingredients",
    examplePain: "Low repeat purchase rate, paid ads getting expensive, weak email flows",
    exampleResult: "Reach $100k/mo with 35% repeat customer rate and 3.5+ ROAS",
    exampleTransformation: "DTC brand at $100k/mo with strong retention engine and predictable paid acquisition",
    exampleNotFit: "Bargain hunters or one-time gift buyers",
    stageOptions: [
      { value: "launching", label: "Launching" },
      { value: "early", label: "Early (5–25k/mo)" },
      { value: "growing", label: "Growing (25–100k/mo)" },
      { value: "scaling", label: "Scaling (100k+/mo)" },
    ],
    nicheOptions: [
      { value: "beauty", label: "Beauty & Skincare" },
      { value: "apparel", label: "Apparel & Accessories" },
      { value: "home", label: "Home & Lifestyle" },
      { value: "wellness", label: "Health & Wellness" },
      { value: "food", label: "Food & Beverage" },
      { value: "pet", label: "Pet Products" },
      { value: "kids", label: "Baby & Kids" },
      { value: "tech", label: "Tech / Gadgets" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "Eco-conscious women 28–45 buying premium skincare with clean ingredients",
      "Active men 25–40 buying performance apparel they can wear all day",
      "New parents looking for safe, beautifully designed baby essentials",
    ],
    exampleDailyFrustration: "Cart abandonment, low repeat purchase rate, ad costs creeping up, weak email flows.",
    exampleDreamScenario: "Steady daily orders, customers tagging the brand on social, 35%+ repeat purchase rate.",
    exampleNicheMarket: "Premium clean skincare for women 28–45 in the DACH region.",
    examplePointA: "Store at $15k/mo, repeat rate under 15%, ROAS dropping, no SMS retention flow.",
    exampleExternal: "Monthly revenue, AOV, repeat rate, ROAS, brand recognition.",
    offerExamples: [
      "First-purchase discount / quiz",
      "Bestseller / hero product",
      "Bundle / subscription offer",
      "Premium / VIP tier",
    ],
    growthExamples: [
      "Paid social (Meta / TikTok)",
      "Influencer / UGC partnerships",
      "Email & SMS retention flows",
      "Organic content / SEO",
    ],
    brandExamples: [
      "Premium lifestyle brand",
      "Mission-driven / cause brand",
      "Category challenger / disruptor",
    ],
    proofExamples: [
      "Customer reviews & ratings",
      "User-generated content",
      "Press features & awards",
      "Repeat customer / NPS stats",
    ],
  },
  "local-business": {
    id: "local-business",
    label: "Local Business",
    icon: Store,
    shortDescription: "Service or storefront serving a local geographic market.",
    customerNoun: "customers",
    customerNounSingular: "customer",
    outcomeNoun: "bookings",
    vocabulary: [
      "customers", "bookings", "appointments", "foot traffic",
      "service area", "reviews", "repeat visits", "local SEO",
    ],
    exampleAvatar: "Homeowners in our service area aged 35–60 who need quick, reliable HVAC service",
    examplePain: "Inconsistent bookings between seasons, low Google reviews, weak repeat business",
    exampleResult: "Fully booked calendar with 90% 5-star reviews and a steady waitlist",
    exampleTransformation: "Booked solid 4 weeks out with a referral pipeline and recognized local brand",
    exampleNotFit: "Price-shoppers outside service area or one-time emergency-only callers",
    stageOptions: [
      { value: "new", label: "Just opened" },
      { value: "growing", label: "Growing locally" },
      { value: "established", label: "Established" },
      { value: "expanding", label: "Multi-location" },
    ],
    nicheOptions: [
      { value: "home-services", label: "Home Services (HVAC, Plumbing, Electric)" },
      { value: "beauty", label: "Beauty / Salon" },
      { value: "fitness", label: "Gym / Fitness Studio" },
      { value: "wellness", label: "Wellness / Therapy" },
      { value: "restaurant", label: "Restaurant / Café" },
      { value: "retail", label: "Local Retail Store" },
      { value: "automotive", label: "Automotive" },
      { value: "professional", label: "Professional Services (Legal, Accounting)" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "Homeowners 35–60 in our service area needing reliable HVAC service",
      "Busy professionals nearby looking for a gym they'll actually stick with",
      "Locals seeking a trusted neighborhood salon with consistent quality",
    ],
    exampleDailyFrustration: "Inconsistent bookings between seasons, low Google reviews, weak repeat business.",
    exampleDreamScenario: "Fully booked calendar weeks ahead, glowing 5-star reviews, steady referral pipeline.",
    exampleNicheMarket: "Homeowners 35–60 in [your city] needing fast, reliable HVAC service.",
    examplePointA: "Booked 50% of capacity, 30 reviews on Google, no follow-up system for past customers.",
    exampleExternal: "Bookings filled, review count, repeat customers, recognized local brand.",
    offerExamples: [
      "Free quote / consultation",
      "First-time visit special",
      "Core service package",
      "Premium / membership plan",
    ],
    growthExamples: [
      "Google Business Profile + reviews",
      "Local SEO & directories",
      "Geo-targeted ads",
      "Referrals & community partnerships",
    ],
    brandExamples: [
      "Trusted neighborhood pro",
      "Premium local specialist",
      "Friendly community brand",
    ],
    proofExamples: [
      "Google / Yelp reviews",
      "Before/after photos",
      "Local press mentions",
      "Years in business / certifications",
    ],
  },
  other: {
    id: "other",
    label: "Other",
    icon: Layers,
    shortDescription: "A mix or something not listed — generic vocabulary.",
    customerNoun: "customers",
    customerNounSingular: "customer",
    outcomeNoun: "outcome",
    vocabulary: ["customers", "offer", "results", "growth"],
    exampleAvatar: "Specific people you serve who urgently need what you do best",
    examplePain: "The main problem they face right now and can't solve on their own",
    exampleResult: "The clear, measurable result you help them achieve",
    exampleTransformation: "The new identity, lifestyle and results once they work with you",
    exampleNotFit: "People who aren't ready or willing to do the work",
    stageOptions: [
      { value: "starting", label: "Just starting" },
      { value: "growing", label: "Growing" },
      { value: "established", label: "Established" },
      { value: "scaling", label: "Scaling" },
    ],
    nicheOptions: [
      { value: "service", label: "Service Business" },
      { value: "saas", label: "SaaS / Software" },
      { value: "creative", label: "Creative / Freelance" },
      { value: "nonprofit", label: "Nonprofit" },
      { value: "community", label: "Community / Membership" },
      { value: "media", label: "Media / Publishing" },
      { value: "other", label: "Other" },
    ],
    avatarExamples: [
      "Specific people you serve who urgently need what you do best",
      "A clearly defined group with a shared problem you've solved repeatedly",
    ],
    exampleDailyFrustration: "The recurring problem they face that keeps them stuck.",
    exampleDreamScenario: "What their ideal day or business looks like once you've helped them.",
    exampleNicheMarket: "Be specific — who you serve and the result you deliver.",
    examplePointA: "Where they are today — problem, situation, identity.",
    exampleExternal: "The visible, measurable changes they'll experience.",
    offerExamples: [
      "Free entry offer / lead magnet",
      "Low-ticket starter offer",
      "Core / signature offer",
      "Premium offer",
    ],
    growthExamples: [
      "Organic content",
      "Outbound / direct outreach",
      "Paid traffic + funnel",
      "Partnerships & referrals",
    ],
    brandExamples: [
      "Expert authority",
      "Community-driven",
      "Premium specialist",
    ],
    proofExamples: [
      "Testimonials",
      "Case studies",
      "Results & metrics",
      "Credentials & features",
    ],
  },
};

export const BUSINESS_TYPE_LIST = Object.values(BUSINESS_TYPES);

export function getBusinessType(id?: string | null): BusinessTypeDef {
  if (id && id in BUSINESS_TYPES) return BUSINESS_TYPES[id as BusinessTypeId];
  return BUSINESS_TYPES.coach;
}
