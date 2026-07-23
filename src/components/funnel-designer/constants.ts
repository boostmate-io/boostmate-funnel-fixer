// NOTE: TrafficSource / TRAFFIC_SOURCES / TRAFFIC_SOURCE_GROUPS were removed
// in the V3 Growth Architecture pass. Acquisition channels are now sourced
// exclusively from the `acquisition_channels` DB table via
// `useAcquisitionChannelsGrouped()` — the single source of truth shared with
// the Blueprint Growth Architecture.

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
  { type: "dm", label: "funnelDesigner.elements.dm", description: "", icon: "Send", color: "#EC4899", group: "Communication", isDecision: false, renderStyle: "icon" },
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
  { type: "shape", label: "funnelDesigner.elements.shape", description: "", icon: "Shapes", color: "#9CA3AF", group: "Utility", isDecision: false, renderStyle: "shape" },
];

// Keep backward compat alias
export const FUNNEL_PAGES = FUNNEL_ELEMENTS;

// Decision elements that get yes/no handles
export const DECISION_ELEMENT_TYPES = FUNNEL_ELEMENTS.filter(e => e.isDecision).map(e => e.type);
