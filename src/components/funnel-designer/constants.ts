export const TRAFFIC_SOURCES = [
  { type: "youtube", label: "YouTube", icon: "Youtube", color: "#FF0000" },
  { type: "instagram", label: "Instagram", icon: "Instagram", color: "#E1306C" },
  { type: "facebook", label: "Facebook", icon: "Facebook", color: "#1877F2" },
  { type: "tiktok", label: "Music", icon: "Music", color: "#000000" },
  { type: "google", label: "Google", icon: "Search", color: "#4285F4" },
  { type: "email", label: "Email", icon: "Mail", color: "#34A853" },
  { type: "podcast", label: "Podcast", icon: "Podcast", color: "#8B5CF6" },
  { type: "affiliate", label: "Affiliate", icon: "Users", color: "#F59E0B" },
] as const;

export const FUNNEL_PAGES = [
  { type: "opt-in", label: "funnelDesigner.pages.optIn", description: "funnelDesigner.pages.optInDesc", icon: "FileText", color: "#3B82F6" },
  { type: "squeeze", label: "funnelDesigner.pages.squeeze", description: "funnelDesigner.pages.squeezeDesc", icon: "Zap", color: "#8B5CF6" },
  { type: "bridge", label: "funnelDesigner.pages.bridge", description: "funnelDesigner.pages.bridgeDesc", icon: "ArrowRight", color: "#10B981" },
  { type: "sales", label: "funnelDesigner.pages.sales", description: "funnelDesigner.pages.salesDesc", icon: "FileText", color: "#F59E0B" },
  { type: "webinar", label: "funnelDesigner.pages.webinar", description: "funnelDesigner.pages.webinarDesc", icon: "Video", color: "#EC4899" },
  { type: "application", label: "funnelDesigner.pages.application", description: "funnelDesigner.pages.applicationDesc", icon: "ClipboardList", color: "#EF4444" },
  { type: "calendar", label: "funnelDesigner.pages.calendar", description: "funnelDesigner.pages.calendarDesc", icon: "Calendar", color: "#6366F1" },
  { type: "tripwire", label: "funnelDesigner.pages.tripwire", description: "funnelDesigner.pages.tripwireDesc", icon: "Zap", color: "#F43F5E" },
  { type: "order-form", label: "funnelDesigner.pages.orderForm", description: "funnelDesigner.pages.orderFormDesc", icon: "ShoppingCart", color: "#14B8A6" },
  { type: "checkout", label: "funnelDesigner.pages.checkout", description: "funnelDesigner.pages.checkoutDesc", icon: "CreditCard", color: "#0EA5E9" },
  { type: "upsell", label: "funnelDesigner.pages.upsell", description: "funnelDesigner.pages.upsellDesc", icon: "TrendingUp", color: "#22C55E" },
  { type: "downsell", label: "funnelDesigner.pages.downsell", description: "funnelDesigner.pages.downsellDesc", icon: "TrendingDown", color: "#F97316" },
  { type: "confirmation", label: "funnelDesigner.pages.confirmation", description: "funnelDesigner.pages.confirmationDesc", icon: "CheckCircle", color: "#10B981" },
  { type: "thank-you", label: "funnelDesigner.pages.thankYou", description: "funnelDesigner.pages.thankYouDesc", icon: "Heart", color: "#EC4899" },
  { type: "membership", label: "funnelDesigner.pages.membership", description: "funnelDesigner.pages.membershipDesc", icon: "Users", color: "#6366F1" },
] as const;
