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
