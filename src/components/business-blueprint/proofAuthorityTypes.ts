// =============================================================================
// Types & helpers for the Proof & Authority module.
// Stored in business_blueprints.proof_authority (jsonb).
// =============================================================================

export interface FounderStory {
  id: string;
  title?: string;
  before?: string;
  challenge?: string;
  breakthrough?: string;
  learned?: string;
  after?: string;
  core_lesson?: string;
  emotional_theme?: string;
  external_link?: string;
}

export interface AuthorityPositioningData {
  authority_types: string[];           // multi-select
  credibility_foundations: string[];   // multi-select
  trust_reason?: string;               // textarea
  signature_proof?: string;            // textarea
  founder_stories: FounderStory[];
}

export interface CredibilityMetric {
  id: string;
  metric?: string;
  value?: string;
  context?: string;
}

export interface ClientResult {
  id: string;
  client_type?: string;
  problem?: string;
  result_achieved?: string;
  timeframe?: string;
  explanation?: string;
  measurable_outcome?: string;
  quote?: string;
  proof_type?: string;
  external_link?: string;
  offer_ids?: string[]; // 🆕 V3: optional association to offers
}

export interface Testimonial {
  id: string;
  client_name?: string;
  client_type?: string;
  quote?: string;
  main_outcome?: string;
  tone?: string;
  external_link?: string;
  offer_ids?: string[]; // 🆕 V3
}

export interface AuthorityAsset {
  id: string;
  name?: string;
  description?: string;
  why_it_matters?: string;
  external_link?: string;
  offer_ids?: string[]; // 🆕 V3
}

export interface SocialProofData {
  metrics: CredibilityMetric[];
  client_results: ClientResult[];
  testimonials: Testimonial[];
  authority_assets: AuthorityAsset[];
}

// V3: Rich objection schema. Objections live at the offer level; this type
// remains here for legacy read-compatibility of business_blueprints.proof_authority.
export interface Objection {
  id: string;
  objection?: string;
  why_believed?: string;
  emotional_concern?: string;
  reframe?: string;
  supporting_proof_ids?: string[];
  supporting_proof_text?: string;
  /** Legacy field — kept for read compatibility only. */
  supporting_proof?: string;
}
export interface FailedSolution {
  id: string;
  what_tried?: string;
  why_failed?: string;
  why_different?: string;
}
export interface FAQ {
  id: string;
  question?: string;
  answer?: string;
}
export interface ObjectionsBeliefsData {
  objections: Objection[];
  failed_solutions: FailedSolution[];
  faqs: FAQ[];
}

export interface ValueLesson {
  id: string;
  title?: string;
  main_topic?: string;
  common_challenge?: string;
  core_insight?: string;
  why_matters?: string;
  breakthrough_lesson?: string;
  cta_goal?: string;
  external_link?: string;
  offer_ids?: string[]; // 🆕 V3
}
export interface CommonMistake {
  id: string;
  mistake?: string;
  why_made?: string;
  better_approach?: string;
}
export interface BeliefShift {
  id: string;
  old_belief?: string;
  new_belief?: string;
  why_matters?: string;
}
export interface EducationalMessagingData {
  lessons: ValueLesson[];
  mistakes: CommonMistake[];
  belief_shifts: BeliefShift[];
}

export interface ProofAuthorityData {
  authority: AuthorityPositioningData;
  social_proof: SocialProofData;
  objections: ObjectionsBeliefsData;
  educational: EducationalMessagingData;
}

export const AUTHORITY_TYPE_OPTIONS = [
  "Results-Driven Expert",
  "Methodology Expert",
  "Experience-Based Mentor",
  "Specialist",
  "Educator",
  "Operator / Practitioner",
  "Premium Authority",
  "Thought Leader",
];

export const CREDIBILITY_FOUNDATION_OPTIONS = [
  "Personal experience",
  "Client results",
  "Certifications",
  "Methodology",
  "Years experience",
  "Specialization",
  "Media recognition",
  "Audience size",
  "Partnerships",
];

export const EMOTIONAL_THEME_OPTIONS = [
  "Burnout",
  "Confidence",
  "Freedom",
  "Identity",
  "Relationships",
  "Business growth",
  "Transformation",
];

export const PROOF_TYPE_OPTIONS = [
  "Text Testimonial",
  "Video Testimonial",
  "Screenshot",
  "Case Study",
  "Internal Data",
  "Other",
];

export const TONE_OPTIONS = [
  "Emotional",
  "Analytical",
  "Transformation-focused",
  "ROI-focused",
  "Confidence-focused",
];

export const CTA_GOAL_OPTIONS = [
  "Create awareness",
  "Increase urgency",
  "Build trust",
  "Challenge beliefs",
  "Encourage application",
  "Encourage purchase",
];

export function emptyProofAuthority(): ProofAuthorityData {
  return {
    authority: {
      authority_types: [],
      credibility_foundations: [],
      trust_reason: "",
      signature_proof: "",
      founder_stories: [],
    },
    social_proof: { metrics: [], client_results: [], testimonials: [], authority_assets: [] },
    objections: { objections: [], failed_solutions: [], faqs: [] },
    educational: { lessons: [], mistakes: [], belief_shifts: [] },
  };
}

export function normalizeProofAuthority(raw: any): ProofAuthorityData {
  const empty = emptyProofAuthority();
  if (!raw || typeof raw !== "object") return empty;
  return {
    authority: { ...empty.authority, ...(raw.authority || {}),
      authority_types: Array.isArray(raw?.authority?.authority_types) ? raw.authority.authority_types : [],
      credibility_foundations: Array.isArray(raw?.authority?.credibility_foundations) ? raw.authority.credibility_foundations : [],
      founder_stories: Array.isArray(raw?.authority?.founder_stories) ? raw.authority.founder_stories : [],
    },
    social_proof: {
      metrics: Array.isArray(raw?.social_proof?.metrics) ? raw.social_proof.metrics : [],
      client_results: Array.isArray(raw?.social_proof?.client_results) ? raw.social_proof.client_results : [],
      testimonials: Array.isArray(raw?.social_proof?.testimonials) ? raw.social_proof.testimonials : [],
      authority_assets: Array.isArray(raw?.social_proof?.authority_assets) ? raw.social_proof.authority_assets : [],
    },
    objections: {
      objections: Array.isArray(raw?.objections?.objections) ? raw.objections.objections : [],
      failed_solutions: Array.isArray(raw?.objections?.failed_solutions) ? raw.objections.failed_solutions : [],
      faqs: Array.isArray(raw?.objections?.faqs) ? raw.objections.faqs : [],
    },
    educational: {
      lessons: Array.isArray(raw?.educational?.lessons) ? raw.educational.lessons : [],
      mistakes: Array.isArray(raw?.educational?.mistakes) ? raw.educational.mistakes : [],
      belief_shifts: Array.isArray(raw?.educational?.belief_shifts) ? raw.educational.belief_shifts : [],
    },
  };
}

const hasText = (v?: string) => !!(v && v.trim().length > 0);

export function calcProofAuthorityProgress(d: ProofAuthorityData): number {
  let score = 0;
  let total = 0;
  // Authority
  total += 4;
  if (d.authority.authority_types.length > 0) score++;
  if (d.authority.credibility_foundations.length > 0) score++;
  if (hasText(d.authority.trust_reason)) score++;
  if (hasText(d.authority.signature_proof)) score++;
  // Social proof
  total += 4;
  if (d.social_proof.metrics.length > 0) score++;
  if (d.social_proof.client_results.length > 0) score++;
  if (d.social_proof.testimonials.length > 0) score++;
  if (d.social_proof.authority_assets.length > 0) score++;
  // V3: Objections & Beliefs removed from this section (moved to offer level).
  // Stories & Lessons
  total += 2;
  if (d.authority.founder_stories.length > 0) score++;
  if (d.educational.lessons.length > 0) score++;
  return Math.round((score / total) * 100);
}
