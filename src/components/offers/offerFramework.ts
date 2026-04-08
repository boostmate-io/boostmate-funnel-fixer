// Fixed, opinionated Offer Framework — system-defined sections and fields.

export type OfferFieldType = "text" | "textarea" | "number" | "select" | "list";

export interface OfferField {
  id: string;
  label: string;
  description?: string;
  type: OfferFieldType;
  placeholder?: string;
  options?: string[]; // for select
  listItemLabel?: string; // for list fields
}

export interface OfferSubSection {
  id: string;
  title: string;
  fields: OfferField[];
}

export interface OfferSection {
  id: string;
  title: string;
  icon: string; // lucide icon name
  description: string;
  fields: OfferField[];
  subSections?: OfferSubSection[];
}

export type OfferData = Record<string, string | string[] | number | null>;
export type OfferStatus = "draft" | "in_review" | "approved";

export interface Offer {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  status: OfferStatus;
  data: OfferData;
  completion: number;
  created_at: string;
  updated_at: string;
}

export const OFFER_SECTIONS: OfferSection[] = [
  {
    id: "foundation",
    title: "Offer Foundation",
    icon: "Gem",
    description: "Define the core structure and positioning of your offer.",
    fields: [
      { id: "offer_name", label: "Offer Name", type: "text", placeholder: "e.g. The Growth Accelerator Program" },
      { id: "offer_type", label: "Offer Type", type: "select", options: ["Coaching Program", "Online Course", "Done-For-You Service", "Consulting", "Membership", "Workshop", "Mastermind", "Digital Product", "SaaS", "Other"] },
      { id: "price", label: "Price / Pricing Model", type: "text", placeholder: "e.g. €2,497 one-time or €997/month" },
      { id: "payment_options", label: "Payment Options", type: "textarea", placeholder: "e.g. Pay in full, 3x monthly, 6x monthly..." },
      { id: "delivery_timeline", label: "Delivery Timeline / Duration", type: "text", placeholder: "e.g. 12 weeks, 6 months, lifetime access..." },
      { id: "core_cta", label: "Core CTA / Sales Mechanism", type: "select", options: ["Book a Call", "Buy Now", "Apply", "Join Waitlist", "Free Trial", "Download", "Schedule Demo", "Other"] },
    ],
  },
  {
    id: "dream_outcome",
    title: "Dream Outcome",
    icon: "Star",
    description: "Describe the transformation your client desires.",
    fields: [
      { id: "specific_outcome", label: "What specific outcome does the client want?", type: "textarea", placeholder: "Describe the concrete result they're after..." },
      { id: "dream_state", label: "What is their dream state?", type: "textarea", placeholder: "Paint the picture of their ideal situation..." },
      { id: "why_outcome", label: "Why do they want this outcome?", type: "textarea", placeholder: "What drives them to seek this transformation..." },
      { id: "emotional_transformation", label: "What emotional/lifestyle transformation does this create?", type: "textarea", placeholder: "How will their daily life and feelings change..." },
      { id: "deeper_desire", label: "What bigger identity/status/desire sits underneath this?", type: "textarea", placeholder: "What deeper need does this fulfill..." },
    ],
  },
  {
    id: "current_pain",
    title: "Current Pain / Friction",
    icon: "AlertTriangle",
    description: "Understand the frustrations and barriers your client faces.",
    fields: [
      { id: "frustrations", label: "What frustrations/pains do they currently experience?", type: "textarea", placeholder: "List their main pain points..." },
      { id: "barriers", label: "What is stopping them from getting desired results?", type: "textarea", placeholder: "What obstacles stand in their way..." },
      { id: "cost_of_inaction", label: "What happens if they do nothing?", type: "textarea", placeholder: "Describe the consequences of not acting..." },
      { id: "previous_attempts", label: "What have they tried before?", type: "textarea", placeholder: "List previous solutions they've attempted..." },
      { id: "why_failed", label: "Why did previous attempts fail?", type: "textarea", placeholder: "Explain why other approaches didn't work..." },
    ],
  },
  {
    id: "mechanism",
    title: "Unique Mechanism",
    icon: "Lightbulb",
    description: "Articulate what makes your approach unique and superior.",
    fields: [
      { id: "different_approach", label: "What makes your approach different?", type: "textarea", placeholder: "Describe your unique angle..." },
      { id: "unique_methodology", label: "What is unique/new about your methodology?", type: "textarea", placeholder: "Explain your proprietary process or framework..." },
      { id: "why_better", label: "Why does your solution work better?", type: "textarea", placeholder: "What gives your approach an edge..." },
      { id: "challenged_beliefs", label: "What beliefs/perspectives do you challenge?", type: "textarea", placeholder: "What common assumptions do you break..." },
    ],
  },
  {
    id: "deliverables",
    title: "Offer Deliverables",
    icon: "Package",
    description: "Detail everything included in your offer.",
    fields: [
      { id: "core_delivery", label: "Core Service / Main Delivery", type: "textarea", placeholder: "What is the primary thing they receive..." },
      { id: "calls_meetings", label: "Calls / Meetings Included", type: "textarea", placeholder: "e.g. Weekly group calls, 2x 1:1 sessions/month..." },
      { id: "templates_resources", label: "Templates / Resources Included", type: "textarea", placeholder: "e.g. Workbooks, templates, swipe files..." },
      { id: "tools_software", label: "Systems / Software / Tools Included", type: "textarea", placeholder: "e.g. Access to proprietary software, tools..." },
      { id: "support_access", label: "Support Access", type: "textarea", placeholder: "e.g. Slack group, email support, Voxer..." },
      { id: "community_access", label: "Community Access", type: "textarea", placeholder: "e.g. Private Facebook group, Circle community..." },
      { id: "bonuses", label: "Bonuses Included", type: "textarea", placeholder: "List any bonuses or extras..." },
    ],
  },
  {
    id: "value_optimization",
    title: "Value Optimization",
    icon: "TrendingUp",
    description: "Optimize perceived value across all four dimensions.",
    fields: [],
    subSections: [
      {
        id: "vo_goal",
        title: "Goal / Dream State",
        fields: [
          { id: "vo_dream_help", label: "How does this help clients reach their dream state?", type: "textarea", placeholder: "Connect deliverables to outcomes..." },
          { id: "vo_milestones", label: "What milestones does it help them achieve?", type: "textarea", placeholder: "List key milestones along the journey..." },
        ],
      },
      {
        id: "vo_time",
        title: "Time",
        fields: [
          { id: "vo_faster_results", label: "How do you help them get results faster?", type: "textarea", placeholder: "What shortcuts or accelerators do you provide..." },
          { id: "vo_reduce_effort", label: "How do you reduce required effort/work?", type: "textarea", placeholder: "What do you take off their plate..." },
        ],
      },
      {
        id: "vo_risk",
        title: "Risk",
        fields: [
          { id: "vo_reduce_risk", label: "How do you reduce risk / increase certainty?", type: "textarea", placeholder: "What safety nets or assurances do you provide..." },
          { id: "vo_guarantees", label: "Do you offer guarantees?", type: "textarea", placeholder: "Describe any guarantees or assurances..." },
          { id: "vo_predictable", label: "What makes the outcome more predictable?", type: "textarea", placeholder: "What proof or systems ensure consistent results..." },
        ],
      },
      {
        id: "vo_access",
        title: "Access",
        fields: [
          { id: "vo_access_level", label: "What level of access do clients get?", type: "textarea", placeholder: "Describe proximity and access to you/team..." },
          { id: "vo_support_type", label: "Is support group / 1:1 / direct / in-person?", type: "textarea", placeholder: "Specify the type and format of support..." },
          { id: "vo_access_value", label: "What makes your access valuable?", type: "textarea", placeholder: "Why is access to you/your team worth having..." },
        ],
      },
    ],
  },
  {
    id: "proof",
    title: "Proof / Credibility",
    icon: "Award",
    description: "Build trust with evidence and social proof.",
    fields: [
      { id: "years_experience", label: "Years Experience", type: "text", placeholder: "e.g. 10+ years" },
      { id: "clients_helped", label: "Clients Helped", type: "text", placeholder: "e.g. 500+ clients" },
      { id: "revenue_generated", label: "Revenue Generated", type: "text", placeholder: "e.g. €10M+ in client results" },
      { id: "case_studies", label: "Case Studies", type: "textarea", placeholder: "Summarize your best case studies..." },
      { id: "testimonials", label: "Testimonials", type: "textarea", placeholder: "List key testimonial highlights..." },
      { id: "brand_logos", label: "Brand Logos / Endorsements", type: "textarea", placeholder: "Notable brands or endorsements..." },
      { id: "credentials", label: "Credentials / Qualifications", type: "textarea", placeholder: "Certifications, degrees, awards..." },
    ],
  },
  {
    id: "pricing_strategy",
    title: "Pricing Strategy",
    icon: "DollarSign",
    description: "Structure your pricing and payment options.",
    fields: [
      { id: "primary_price", label: "Primary Price", type: "text", placeholder: "e.g. €4,997" },
      { id: "payment_plan_1", label: "Payment Plan Option 1", type: "text", placeholder: "e.g. 3x €1,797" },
      { id: "payment_plan_2", label: "Payment Plan Option 2", type: "text", placeholder: "e.g. 6x €947" },
      { id: "pay_full_incentive", label: "Pay In Full Incentive", type: "textarea", placeholder: "e.g. Save €394 + get bonus module..." },
      { id: "commitment_duration", label: "Contract / Commitment Duration", type: "text", placeholder: "e.g. 6 months minimum" },
      { id: "pricing_rationale", label: "Why is this priced this way?", type: "textarea", placeholder: "Explain the value-to-price relationship..." },
    ],
  },
  {
    id: "guarantee",
    title: "Guarantee / Risk Reversal",
    icon: "Shield",
    description: "Remove buyer hesitation with a strong guarantee.",
    fields: [
      { id: "guarantee_offered", label: "Guarantee Offered", type: "textarea", placeholder: "e.g. 30-day money-back guarantee, results guarantee..." },
      { id: "guarantee_conditions", label: "Guarantee Conditions", type: "textarea", placeholder: "What conditions apply to the guarantee..." },
      { id: "guarantee_rationale", label: "Why can you offer this guarantee?", type: "textarea", placeholder: "What gives you confidence to guarantee this..." },
    ],
  },
  {
    id: "objections",
    title: "Objections / FAQ",
    icon: "HelpCircle",
    description: "Anticipate and overcome common objections.",
    fields: [
      { id: "objection_1", label: "Objection 1", type: "text", placeholder: "e.g. It's too expensive" },
      { id: "rebuttal_1", label: "Rebuttal 1", type: "textarea", placeholder: "How you address this objection..." },
      { id: "objection_2", label: "Objection 2", type: "text", placeholder: "e.g. I don't have time" },
      { id: "rebuttal_2", label: "Rebuttal 2", type: "textarea", placeholder: "How you address this objection..." },
      { id: "objection_3", label: "Objection 3", type: "text", placeholder: "e.g. I've tried this before" },
      { id: "rebuttal_3", label: "Rebuttal 3", type: "textarea", placeholder: "How you address this objection..." },
      { id: "objection_4", label: "Objection 4", type: "text", placeholder: "e.g. I need to think about it" },
      { id: "rebuttal_4", label: "Rebuttal 4", type: "textarea", placeholder: "How you address this objection..." },
      { id: "objection_5", label: "Objection 5", type: "text", placeholder: "e.g. Will this work for me?" },
      { id: "rebuttal_5", label: "Rebuttal 5", type: "textarea", placeholder: "How you address this objection..." },
      { id: "faq_1_q", label: "FAQ Question 1", type: "text", placeholder: "Common question..." },
      { id: "faq_1_a", label: "FAQ Answer 1", type: "textarea", placeholder: "Answer..." },
      { id: "faq_2_q", label: "FAQ Question 2", type: "text", placeholder: "Common question..." },
      { id: "faq_2_a", label: "FAQ Answer 2", type: "textarea", placeholder: "Answer..." },
      { id: "faq_3_q", label: "FAQ Question 3", type: "text", placeholder: "Common question..." },
      { id: "faq_3_a", label: "FAQ Answer 3", type: "textarea", placeholder: "Answer..." },
    ],
  },
];

/** Count how many fields have values filled in */
export function computeOfferCompletion(data: OfferData): number {
  const allFields = OFFER_SECTIONS.flatMap((s) => [
    ...s.fields,
    ...(s.subSections?.flatMap((ss) => ss.fields) ?? []),
  ]);
  const total = allFields.length;
  if (total === 0) return 0;
  const filled = allFields.filter((f) => {
    const v = data[f.id];
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
  return Math.round((filled / total) * 100);
}

export const STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
};

export const STATUS_COLORS: Record<OfferStatus, string> = {
  draft: "bg-muted/50 text-muted-foreground",
  in_review: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
};
