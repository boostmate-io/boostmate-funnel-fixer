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
  /** Render style on canvas: "page" = wireframe thumbnail, "icon" = circle with icon, "note" = sticky note, "text" = plain text, "shape" = geometric shape */
  renderStyle: "page" | "icon" | "note" | "text" | "shape";
}

export const TRAFFIC_SOURCE_GROUPS = [
  "Paid Traffic",
  "Organic Traffic",
  "Owned Traffic",
  "Referral & Partnerships",
  "Direct & Other",
] as const;

export const TRAFFIC_SOURCES: TrafficSource[] = [
  // Paid Traffic
  { type: "facebook-ads", label: "Facebook Ads", icon: "Facebook", color: "#1877F2", group: "Paid Traffic" },
  { type: "instagram-ads", label: "Instagram Ads", icon: "Instagram", color: "#E1306C", group: "Paid Traffic" },
  { type: "google-ads", label: "Google Ads", icon: "Search", color: "#FBBC05", group: "Paid Traffic" },
  { type: "youtube-ads", label: "YouTube Ads", icon: "Youtube", color: "#FF0000", group: "Paid Traffic" },
  { type: "tiktok-ads", label: "TikTok Ads", icon: "Music", color: "#000000", group: "Paid Traffic" },
  { type: "linkedin-ads", label: "LinkedIn Ads", icon: "Linkedin", color: "#0A66C2", group: "Paid Traffic" },
  { type: "twitter-ads", label: "Twitter Ads", icon: "Twitter", color: "#1DA1F2", group: "Paid Traffic" },
  { type: "snapchat-ads", label: "Snapchat Ads", icon: "Ghost", color: "#FFFC00", group: "Paid Traffic" },
  { type: "pinterest-ads", label: "Pinterest Ads", icon: "Pin", color: "#E60023", group: "Paid Traffic" },
  { type: "bing-ads", label: "Bing Ads", icon: "Search", color: "#008373", group: "Paid Traffic" },
  { type: "yandex-ads", label: "Yandex Ads", icon: "Search", color: "#FF0000", group: "Paid Traffic" },
  { type: "taboola-ads", label: "Taboola Ads", icon: "Newspaper", color: "#0052CC", group: "Paid Traffic" },
  { type: "outbrain-ads", label: "Outbrain Ads", icon: "Newspaper", color: "#FF6600", group: "Paid Traffic" },
  { type: "email-ads", label: "Email Ads", icon: "Mail", color: "#34A853", group: "Paid Traffic" },
  { type: "podcast-ads", label: "Podcast Ads", icon: "Podcast", color: "#8B5CF6", group: "Paid Traffic" },
  { type: "spotify-ads", label: "Spotify Ads", icon: "Music", color: "#1DB954", group: "Paid Traffic" },
  { type: "radio-ads", label: "Radio Ads", icon: "Radio", color: "#F59E0B", group: "Paid Traffic" },
  { type: "television-ads", label: "Television Ads", icon: "Monitor", color: "#6366F1", group: "Paid Traffic" },
  { type: "magazine-ads", label: "Magazine Ads", icon: "BookOpen", color: "#EC4899", group: "Paid Traffic" },
  { type: "newspaper-ads", label: "Newspaper Ads", icon: "Newspaper", color: "#6B7280", group: "Paid Traffic" },

  // Organic Traffic
  { type: "google-seo", label: "Google SEO", icon: "Search", color: "#4285F4", group: "Organic Traffic" },
  { type: "youtube-organic", label: "YouTube Organic", icon: "Youtube", color: "#FF0000", group: "Organic Traffic" },
  { type: "facebook-organic", label: "Facebook Organic", icon: "Facebook", color: "#1877F2", group: "Organic Traffic" },
  { type: "instagram-organic", label: "Instagram Organic", icon: "Instagram", color: "#E1306C", group: "Organic Traffic" },
  { type: "tiktok-organic", label: "TikTok Organic", icon: "Music", color: "#000000", group: "Organic Traffic" },
  { type: "linkedin-organic", label: "LinkedIn Organic", icon: "Linkedin", color: "#0A66C2", group: "Organic Traffic" },
  { type: "twitter-organic", label: "Twitter Organic", icon: "Twitter", color: "#1DA1F2", group: "Organic Traffic" },
  { type: "pinterest-organic", label: "Pinterest Organic", icon: "Pin", color: "#E60023", group: "Organic Traffic" },
  { type: "blog-articles", label: "Blog / Articles", icon: "BookOpen", color: "#10B981", group: "Organic Traffic" },
  { type: "podcast-own", label: "Podcast (Own Show)", icon: "Podcast", color: "#8B5CF6", group: "Organic Traffic" },

  // Owned Traffic
  { type: "email-owned", label: "Email", icon: "Mail", color: "#34A853", group: "Owned Traffic" },
  { type: "whatsapp", label: "WhatsApp", icon: "MessageCircle", color: "#25D366", group: "Owned Traffic" },
  { type: "telegram", label: "Telegram", icon: "Send", color: "#0088CC", group: "Owned Traffic" },
  { type: "facebook-messenger", label: "Facebook Messenger", icon: "MessageSquare", color: "#0084FF", group: "Owned Traffic" },
  { type: "sms-owned", label: "SMS", icon: "MessageSquare", color: "#06B6D4", group: "Owned Traffic" },
  { type: "discord", label: "Discord", icon: "MessageCircle", color: "#5865F2", group: "Owned Traffic" },
  { type: "slack", label: "Slack", icon: "Hash", color: "#4A154B", group: "Owned Traffic" },
  { type: "skool", label: "Skool", icon: "GraduationCap", color: "#000000", group: "Owned Traffic" },
  { type: "facebook-group", label: "Facebook Group", icon: "Users", color: "#1877F2", group: "Owned Traffic" },

  // Referral & Partnerships
  { type: "affiliates", label: "Affiliates", icon: "Users", color: "#F59E0B", group: "Referral & Partnerships" },
  { type: "jv-partners", label: "JV Partners", icon: "Handshake", color: "#6366F1", group: "Referral & Partnerships" },
  { type: "influencers", label: "Influencers", icon: "Star", color: "#EC4899", group: "Referral & Partnerships" },
  { type: "ugc-creators", label: "UGC Creators", icon: "Camera", color: "#F97316", group: "Referral & Partnerships" },
  { type: "customer-referrals", label: "Customer Referrals", icon: "UserPlus", color: "#10B981", group: "Referral & Partnerships" },
  { type: "partner-referrals", label: "Partner Referrals", icon: "UserPlus", color: "#3B82F6", group: "Referral & Partnerships" },

  // Direct & Other
  { type: "direct-traffic", label: "Direct Traffic", icon: "Globe", color: "#6366F1", group: "Direct & Other" },
  { type: "retargeting", label: "Retargeting", icon: "RefreshCw", color: "#EF4444", group: "Direct & Other" },
  { type: "webinars-traffic", label: "Webinars", icon: "Video", color: "#EC4899", group: "Direct & Other" },
  { type: "live-events", label: "Live Events", icon: "Radio", color: "#F59E0B", group: "Direct & Other" },
  { type: "workshops", label: "Workshops", icon: "Presentation", color: "#8B5CF6", group: "Direct & Other" },
  { type: "conferences", label: "Conferences", icon: "Building", color: "#0EA5E9", group: "Direct & Other" },
  { type: "cpa-network", label: "CPA Network", icon: "Network", color: "#14B8A6", group: "Direct & Other" },
  { type: "marketplaces", label: "Marketplaces", icon: "Store", color: "#F97316", group: "Direct & Other" },
  { type: "cold-outreach", label: "Cold Outreach", icon: "Send", color: "#F97316", group: "Direct & Other" },
  { type: "dm-outreach", label: "DM Outreach", icon: "MessageCircle", color: "#8B5CF6", group: "Direct & Other" },
  { type: "custom-traffic", label: "Custom Traffic Source", icon: "Settings", color: "#6B7280", group: "Direct & Other" },
];

export const FUNNEL_ELEMENT_GROUPS = [
  "Pages",
  "Communication",
  "Actions",
  "Sales Flow",
  "Utility",
] as const;

export const FUNNEL_ELEMENTS: FunnelElement[] = [
  // Pages
  { type: "opt-in", label: "funnelDesigner.elements.optIn", description: "", icon: "FileText", color: "#3B82F6", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "squeeze", label: "funnelDesigner.elements.squeeze", description: "", icon: "Zap", color: "#8B5CF6", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "bridge", label: "funnelDesigner.elements.bridge", description: "", icon: "ArrowRight", color: "#10B981", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "content-page", label: "funnelDesigner.elements.contentPage", description: "", icon: "BookOpen", color: "#10B981", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "sales", label: "funnelDesigner.elements.sales", description: "", icon: "FileText", color: "#F59E0B", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "vsl", label: "funnelDesigner.elements.vsl", description: "", icon: "PlayCircle", color: "#EF4444", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "order-form", label: "funnelDesigner.elements.orderForm", description: "", icon: "ShoppingCart", color: "#14B8A6", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "checkout", label: "funnelDesigner.elements.checkout", description: "", icon: "CreditCard", color: "#0EA5E9", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "2step-order", label: "funnelDesigner.elements.twoStepOrder", description: "", icon: "ListOrdered", color: "#6366F1", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "upsell", label: "funnelDesigner.elements.upsell", description: "", icon: "TrendingUp", color: "#22C55E", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "downsell", label: "funnelDesigner.elements.downsell", description: "", icon: "TrendingDown", color: "#F97316", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "oto", label: "funnelDesigner.elements.oto", description: "", icon: "Zap", color: "#EF4444", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "tripwire", label: "funnelDesigner.elements.tripwire", description: "", icon: "Zap", color: "#F43F5E", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "application", label: "funnelDesigner.elements.application", description: "", icon: "ClipboardList", color: "#EF4444", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "survey", label: "funnelDesigner.elements.survey", description: "", icon: "ListChecks", color: "#14B8A6", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "booking", label: "funnelDesigner.elements.booking", description: "", icon: "CalendarCheck", color: "#8B5CF6", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "calendar", label: "funnelDesigner.elements.calendar", description: "", icon: "Calendar", color: "#6366F1", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "thank-you", label: "funnelDesigner.elements.thankYou", description: "", icon: "Heart", color: "#EC4899", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "confirmation", label: "funnelDesigner.elements.confirmation", description: "", icon: "CheckCircle", color: "#10B981", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "lead-magnet", label: "funnelDesigner.elements.leadMagnet", description: "", icon: "Gift", color: "#10B981", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "webinar-register", label: "funnelDesigner.elements.webinarRegister", description: "", icon: "Video", color: "#EC4899", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "webinar-live", label: "funnelDesigner.elements.webinarLive", description: "", icon: "Radio", color: "#EF4444", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "webinar-replay", label: "funnelDesigner.elements.webinarReplay", description: "", icon: "PlayCircle", color: "#F59E0B", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "webinar-sales", label: "funnelDesigner.elements.webinarSales", description: "", icon: "FileText", color: "#F97316", group: "Pages", isDecision: true, renderStyle: "page" },
  { type: "membership", label: "funnelDesigner.elements.membership", description: "", icon: "Users", color: "#6366F1", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "course-dashboard", label: "funnelDesigner.elements.courseDashboard", description: "", icon: "GraduationCap", color: "#3B82F6", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "community", label: "funnelDesigner.elements.community", description: "", icon: "Users", color: "#8B5CF6", group: "Pages", isDecision: false, renderStyle: "page" },
  { type: "custom-page", label: "funnelDesigner.elements.customPage", description: "", icon: "FileText", color: "#6B7280", group: "Pages", isDecision: false, renderStyle: "page" },

  // Communication
  { type: "email", label: "funnelDesigner.elements.email", description: "", icon: "Mail", color: "#34A853", group: "Communication", isDecision: false, renderStyle: "icon" },
  { type: "broadcast-email", label: "funnelDesigner.elements.broadcastEmail", description: "", icon: "Mails", color: "#3B82F6", group: "Communication", isDecision: false, renderStyle: "icon" },
  { type: "sms", label: "funnelDesigner.elements.sms", description: "", icon: "MessageSquare", color: "#06B6D4", group: "Communication", isDecision: false, renderStyle: "icon" },
  { type: "phone-call", label: "funnelDesigner.elements.phoneCall", description: "", icon: "Phone", color: "#10B981", group: "Communication", isDecision: false, renderStyle: "icon" },
  { type: "phone-order", label: "funnelDesigner.elements.phoneOrder", description: "", icon: "PhoneCall", color: "#F59E0B", group: "Communication", isDecision: true, renderStyle: "icon" },
  { type: "chatbot", label: "funnelDesigner.elements.chatbot", description: "", icon: "Bot", color: "#8B5CF6", group: "Communication", isDecision: false, renderStyle: "icon" },
  { type: "chatbot-optin", label: "funnelDesigner.elements.chatbotOptIn", description: "", icon: "Bot", color: "#3B82F6", group: "Communication", isDecision: false, renderStyle: "icon" },
  { type: "fb-messenger", label: "funnelDesigner.elements.fbMessenger", description: "", icon: "MessageCircle", color: "#0084FF", group: "Communication", isDecision: false, renderStyle: "icon" },

  // Actions
  { type: "wait", label: "funnelDesigner.elements.wait", description: "", icon: "Clock", color: "#6B7280", group: "Actions", isDecision: false, renderStyle: "icon" },

  // Sales Flow
  { type: "popup", label: "funnelDesigner.elements.popup", description: "", icon: "Maximize2", color: "#EF4444", group: "Sales Flow", isDecision: false, renderStyle: "page" },

  // Utility
  { type: "notes", label: "funnelDesigner.elements.notes", description: "", icon: "StickyNote", color: "#F59E0B", group: "Utility", isDecision: false, renderStyle: "note" },
  { type: "text", label: "funnelDesigner.elements.text", description: "", icon: "Type", color: "#6B7280", group: "Utility", isDecision: false, renderStyle: "text" },
];

// Keep backward compat alias
export const FUNNEL_PAGES = FUNNEL_ELEMENTS;

// Decision elements that get yes/no handles
export const DECISION_ELEMENT_TYPES = FUNNEL_ELEMENTS.filter(e => e.isDecision).map(e => e.type);
