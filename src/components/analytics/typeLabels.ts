// Human-readable labels for internal node/page type identifiers.
const LABELS: Record<string, string> = {
  trafficSource: "Traffic Source",
  "opt-in": "Opt-in Page",
  "squeeze": "Squeeze Page",
  "bridge": "Bridge Page",
  "webinar": "Webinar",
  "sales": "Sales Page",
  "vsl": "VSL Page",
  "checkout": "Checkout",
  "order-form": "Order Form",
  "tripwire": "Tripwire",
  "upsell": "Upsell",
  "downsell": "Downsell",
  "oto": "One-time Offer",
  "application": "Application",
  "survey": "Survey",
  "calendar": "Calendar",
  "booking": "Booking",
  "thank-you": "Thank You",
  "confirmation": "Confirmation",
  "membership": "Membership",
  "content-page": "Content Page",
  "lead-magnet": "Lead Magnet",
  "custom": "Custom Page",
  "email": "Email",
  "broadcast-email": "Broadcast Email",
  "sms": "SMS",
  "dm": "DM",
  "phone-call": "Phone Call",
  "phone-order": "Phone Order",
  "chatbot": "Chatbot",
  "popup": "Popup",
};

export function prettyTypeLabel(type: string): string {
  if (!type) return "—";
  if (LABELS[type]) return LABELS[type];
  // Fallback: convert kebab/snake to Title Case
  return type
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
