export interface TrafficSource {
  type: string;
  label: string;
  icon: string;
  color: string;
  group: string;
}

export interface FunnelElement {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  group: string;
  isDecision: boolean;
}

export const TRAFFIC_SOURCE_GROUPS = [
  "Social Media",
  "Search & SEO",
  "Paid Advertising",
  "Content & Media",
  "Direct & Outreach",
  "Partnerships",
] as const;

export const TRAFFIC_SOURCES: TrafficSource[] = [
  // Social Media
  { type: "facebook", label: "Facebook", icon: "Facebook", color: "#1877F2", group: "Social Media" },
  { type: "instagram", label: "Instagram", icon: "Instagram", color: "#E1306C", group: "Social Media" },
  { type: "tiktok", label: "TikTok", icon: "Music", color: "#000000", group: "Social Media" },
  { type: "youtube", label: "YouTube", icon: "Youtube", color: "#FF0000", group: "Social Media" },
  { type: "linkedin", label: "LinkedIn", icon: "Linkedin", color: "#0A66C2", group: "Social Media" },
  { type: "twitter", label: "X / Twitter", icon: "Twitter", color: "#1DA1F2", group: "Social Media" },
  { type: "pinterest", label: "Pinterest", icon: "Pin", color: "#E60023", group: "Social Media" },
  { type: "snapchat", label: "Snapchat", icon: "Ghost", color: "#FFFC00", group: "Social Media" },
  // Search & SEO
  { type: "google-organic", label: "Google Organic", icon: "Search", color: "#4285F4", group: "Search & SEO" },
  { type: "bing", label: "Bing", icon: "Search", color: "#008373", group: "Search & SEO" },
  { type: "seo-blog", label: "SEO Blog", icon: "FileText", color: "#34A853", group: "Search & SEO" },
  // Paid Advertising
  { type: "facebook-ads", label: "Facebook Ads", icon: "Facebook", color: "#1877F2", group: "Paid Advertising" },
  { type: "google-ads", label: "Google Ads", icon: "Search", color: "#FBBC05", group: "Paid Advertising" },
  { type: "instagram-ads", label: "Instagram Ads", icon: "Instagram", color: "#E1306C", group: "Paid Advertising" },
  { type: "tiktok-ads", label: "TikTok Ads", icon: "Music", color: "#000000", group: "Paid Advertising" },
  { type: "youtube-ads", label: "YouTube Ads", icon: "Youtube", color: "#FF0000", group: "Paid Advertising" },
  { type: "linkedin-ads", label: "LinkedIn Ads", icon: "Linkedin", color: "#0A66C2", group: "Paid Advertising" },
  { type: "pinterest-ads", label: "Pinterest Ads", icon: "Pin", color: "#E60023", group: "Paid Advertising" },
  { type: "native-ads", label: "Native Ads", icon: "Newspaper", color: "#6B7280", group: "Paid Advertising" },
  // Content & Media
  { type: "podcast", label: "Podcast", icon: "Podcast", color: "#8B5CF6", group: "Content & Media" },
  { type: "blog", label: "Blog", icon: "BookOpen", color: "#10B981", group: "Content & Media" },
  { type: "webinar-traffic", label: "Webinar", icon: "Video", color: "#EC4899", group: "Content & Media" },
  { type: "live-event", label: "Live Event", icon: "Radio", color: "#F59E0B", group: "Content & Media" },
  { type: "video-content", label: "Video Content", icon: "PlayCircle", color: "#EF4444", group: "Content & Media" },
  // Direct & Outreach
  { type: "email", label: "Email", icon: "Mail", color: "#34A853", group: "Direct & Outreach" },
  { type: "sms", label: "SMS", icon: "MessageSquare", color: "#06B6D4", group: "Direct & Outreach" },
  { type: "direct-traffic", label: "Direct Traffic", icon: "Globe", color: "#6366F1", group: "Direct & Outreach" },
  { type: "qr-code", label: "QR Code", icon: "QrCode", color: "#1F2937", group: "Direct & Outreach" },
  { type: "cold-outreach", label: "Cold Outreach", icon: "Send", color: "#F97316", group: "Direct & Outreach" },
  { type: "dm", label: "DM / Chat", icon: "MessageCircle", color: "#8B5CF6", group: "Direct & Outreach" },
  // Partnerships
  { type: "affiliate", label: "Affiliate", icon: "Users", color: "#F59E0B", group: "Partnerships" },
  { type: "referral", label: "Referral", icon: "UserPlus", color: "#10B981", group: "Partnerships" },
  { type: "jv-partner", label: "JV Partner", icon: "Handshake", color: "#6366F1", group: "Partnerships" },
  { type: "influencer", label: "Influencer", icon: "Star", color: "#EC4899", group: "Partnerships" },
];

export const FUNNEL_ELEMENT_GROUPS = [
  "Lead Capture",
  "Sales & Conversion",
  "Checkout & Payment",
  "Post-Purchase",
  "Content & Engagement",
  "Qualification",
  "Automation",
] as const;

export const FUNNEL_ELEMENTS: FunnelElement[] = [
  // Lead Capture
  { type: "opt-in", label: "funnelDesigner.elements.optIn", description: "funnelDesigner.elements.optInDesc", icon: "FileText", color: "#3B82F6", group: "Lead Capture", isDecision: false },
  { type: "squeeze", label: "funnelDesigner.elements.squeeze", description: "funnelDesigner.elements.squeezeDesc", icon: "Zap", color: "#8B5CF6", group: "Lead Capture", isDecision: false },
  { type: "lead-magnet", label: "funnelDesigner.elements.leadMagnet", description: "funnelDesigner.elements.leadMagnetDesc", icon: "Gift", color: "#10B981", group: "Lead Capture", isDecision: false },
  { type: "quiz-survey", label: "funnelDesigner.elements.quizSurvey", description: "funnelDesigner.elements.quizSurveyDesc", icon: "HelpCircle", color: "#F59E0B", group: "Lead Capture", isDecision: false },
  { type: "popup", label: "funnelDesigner.elements.popup", description: "funnelDesigner.elements.popupDesc", icon: "Maximize2", color: "#EF4444", group: "Lead Capture", isDecision: false },
  // Sales & Conversion
  { type: "sales", label: "funnelDesigner.elements.sales", description: "funnelDesigner.elements.salesDesc", icon: "FileText", color: "#F59E0B", group: "Sales & Conversion", isDecision: true },
  { type: "vsl", label: "funnelDesigner.elements.vsl", description: "funnelDesigner.elements.vslDesc", icon: "PlayCircle", color: "#EF4444", group: "Sales & Conversion", isDecision: true },
  { type: "webinar", label: "funnelDesigner.elements.webinar", description: "funnelDesigner.elements.webinarDesc", icon: "Video", color: "#EC4899", group: "Sales & Conversion", isDecision: true },
  { type: "bridge", label: "funnelDesigner.elements.bridge", description: "funnelDesigner.elements.bridgeDesc", icon: "ArrowRight", color: "#10B981", group: "Sales & Conversion", isDecision: false },
  { type: "tripwire", label: "funnelDesigner.elements.tripwire", description: "funnelDesigner.elements.tripwireDesc", icon: "Zap", color: "#F43F5E", group: "Sales & Conversion", isDecision: true },
  { type: "challenge", label: "funnelDesigner.elements.challenge", description: "funnelDesigner.elements.challengeDesc", icon: "Trophy", color: "#8B5CF6", group: "Sales & Conversion", isDecision: true },
  { type: "upsell", label: "funnelDesigner.elements.upsell", description: "funnelDesigner.elements.upsellDesc", icon: "TrendingUp", color: "#22C55E", group: "Sales & Conversion", isDecision: true },
  { type: "downsell", label: "funnelDesigner.elements.downsell", description: "funnelDesigner.elements.downsellDesc", icon: "TrendingDown", color: "#F97316", group: "Sales & Conversion", isDecision: true },
  // Checkout & Payment
  { type: "order-form", label: "funnelDesigner.elements.orderForm", description: "funnelDesigner.elements.orderFormDesc", icon: "ShoppingCart", color: "#14B8A6", group: "Checkout & Payment", isDecision: true },
  { type: "checkout", label: "funnelDesigner.elements.checkout", description: "funnelDesigner.elements.checkoutDesc", icon: "CreditCard", color: "#0EA5E9", group: "Checkout & Payment", isDecision: true },
  { type: "order-bump", label: "funnelDesigner.elements.orderBump", description: "funnelDesigner.elements.orderBumpDesc", icon: "PlusCircle", color: "#6366F1", group: "Checkout & Payment", isDecision: true },
  { type: "payment-plan", label: "funnelDesigner.elements.paymentPlan", description: "funnelDesigner.elements.paymentPlanDesc", icon: "Wallet", color: "#8B5CF6", group: "Checkout & Payment", isDecision: false },
  // Post-Purchase
  { type: "thank-you", label: "funnelDesigner.elements.thankYou", description: "funnelDesigner.elements.thankYouDesc", icon: "Heart", color: "#EC4899", group: "Post-Purchase", isDecision: false },
  { type: "confirmation", label: "funnelDesigner.elements.confirmation", description: "funnelDesigner.elements.confirmationDesc", icon: "CheckCircle", color: "#10B981", group: "Post-Purchase", isDecision: false },
  { type: "membership", label: "funnelDesigner.elements.membership", description: "funnelDesigner.elements.membershipDesc", icon: "Users", color: "#6366F1", group: "Post-Purchase", isDecision: false },
  { type: "onboarding", label: "funnelDesigner.elements.onboarding", description: "funnelDesigner.elements.onboardingDesc", icon: "Rocket", color: "#3B82F6", group: "Post-Purchase", isDecision: false },
  // Content & Engagement
  { type: "content-page", label: "funnelDesigner.elements.contentPage", description: "funnelDesigner.elements.contentPageDesc", icon: "BookOpen", color: "#10B981", group: "Content & Engagement", isDecision: false },
  { type: "blog-post", label: "funnelDesigner.elements.blogPost", description: "funnelDesigner.elements.blogPostDesc", icon: "Newspaper", color: "#6B7280", group: "Content & Engagement", isDecision: false },
  { type: "video-page", label: "funnelDesigner.elements.videoPage", description: "funnelDesigner.elements.videoPageDesc", icon: "PlayCircle", color: "#EF4444", group: "Content & Engagement", isDecision: false },
  { type: "social-proof", label: "funnelDesigner.elements.socialProof", description: "funnelDesigner.elements.socialProofDesc", icon: "ThumbsUp", color: "#F59E0B", group: "Content & Engagement", isDecision: false },
  // Qualification
  { type: "application", label: "funnelDesigner.elements.application", description: "funnelDesigner.elements.applicationDesc", icon: "ClipboardList", color: "#EF4444", group: "Qualification", isDecision: true },
  { type: "calendar", label: "funnelDesigner.elements.calendar", description: "funnelDesigner.elements.calendarDesc", icon: "Calendar", color: "#6366F1", group: "Qualification", isDecision: false },
  { type: "survey", label: "funnelDesigner.elements.survey", description: "funnelDesigner.elements.surveyDesc", icon: "ListChecks", color: "#14B8A6", group: "Qualification", isDecision: false },
  { type: "booking", label: "funnelDesigner.elements.booking", description: "funnelDesigner.elements.bookingDesc", icon: "CalendarCheck", color: "#8B5CF6", group: "Qualification", isDecision: false },
  // Automation
  { type: "email-sequence", label: "funnelDesigner.elements.emailSequence", description: "funnelDesigner.elements.emailSequenceDesc", icon: "Mail", color: "#34A853", group: "Automation", isDecision: false },
  { type: "wait", label: "funnelDesigner.elements.wait", description: "funnelDesigner.elements.waitDesc", icon: "Clock", color: "#6B7280", group: "Automation", isDecision: false },
  { type: "webhook", label: "funnelDesigner.elements.webhook", description: "funnelDesigner.elements.webhookDesc", icon: "Webhook", color: "#1F2937", group: "Automation", isDecision: false },
  { type: "tag", label: "funnelDesigner.elements.tag", description: "funnelDesigner.elements.tagDesc", icon: "Tag", color: "#F97316", group: "Automation", isDecision: false },
  { type: "split-test", label: "funnelDesigner.elements.splitTest", description: "funnelDesigner.elements.splitTestDesc", icon: "GitBranch", color: "#EC4899", group: "Automation", isDecision: true },
];

// Keep backward compat alias
export const FUNNEL_PAGES = FUNNEL_ELEMENTS;

// Decision elements that get yes/no handles
export const DECISION_ELEMENT_TYPES = FUNNEL_ELEMENTS.filter(e => e.isDecision).map(e => e.type);
