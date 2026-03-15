export interface MetricField {
  key: string;
  label: string;
  type: "number" | "currency" | "percentage";
  computed?: (metrics: Record<string, number>) => number | null;
}

export const getMetricsForNodeType = (nodeType: string): MetricField[] => {
  // Traffic sources
  if (nodeType === "trafficSource") {
    return [
      { key: "impressions", label: "Impressions", type: "number" },
      { key: "clicks", label: "Clicks", type: "number" },
      { key: "spend", label: "Spend", type: "currency" },
      { key: "cpc", label: "CPC", type: "currency", computed: (m) => m.clicks ? +(m.spend / m.clicks).toFixed(2) : null },
    ];
  }

  // Page types mapped to metric sets
  const pageMetrics: Record<string, MetricField[]> = {
    "opt-in": visitorsConversions(),
    "squeeze": visitorsConversions(),
    "bridge": visitorsCompletions(),
    "webinar": visitorsCompletions(),
    "sales": visitorsRevenue(),
    "checkout": visitorsRevenue(),
    "order-form": visitorsRevenue(),
    "tripwire": visitorsRevenue(),
    "upsell": upsellMetrics(),
    "downsell": upsellMetrics(),
    "application": visitorsConversions(),
    "calendar": visitorsConversions(),
    "thank-you": [{ key: "visitors", label: "Visitors", type: "number" }],
    "confirmation": [{ key: "visitors", label: "Visitors", type: "number" }],
    "membership": [{ key: "visitors", label: "Visitors", type: "number" }],
  };

  // Check if node type contains "email" keyword (for simulated email steps)
  if (nodeType.toLowerCase().includes("email")) {
    return emailMetrics();
  }

  return pageMetrics[nodeType] || visitorsConversions();
};

function visitorsConversions(): MetricField[] {
  return [
    { key: "visitors", label: "Visitors", type: "number" },
    { key: "conversions", label: "Conversions", type: "number" },
    { key: "conversion_rate", label: "Conv. Rate %", type: "percentage", computed: (m) => m.visitors ? +((m.conversions / m.visitors) * 100).toFixed(1) : null },
  ];
}

function visitorsCompletions(): MetricField[] {
  return [
    { key: "visitors", label: "Visitors", type: "number" },
    { key: "completions", label: "Completions", type: "number" },
    { key: "completion_rate", label: "Compl. Rate %", type: "percentage", computed: (m) => m.visitors ? +((m.completions / m.visitors) * 100).toFixed(1) : null },
  ];
}

function visitorsRevenue(): MetricField[] {
  return [
    { key: "visitors", label: "Visitors", type: "number" },
    { key: "purchases", label: "Purchases", type: "number" },
    { key: "revenue", label: "Revenue", type: "currency" },
    { key: "conversion_rate", label: "Conv. Rate %", type: "percentage", computed: (m) => m.visitors ? +((m.purchases / m.visitors) * 100).toFixed(1) : null },
  ];
}

function upsellMetrics(): MetricField[] {
  return [
    { key: "offered", label: "Offered", type: "number" },
    { key: "accepted", label: "Accepted", type: "number" },
    { key: "revenue", label: "Revenue", type: "currency" },
    { key: "acceptance_rate", label: "Accept. Rate %", type: "percentage", computed: (m) => m.offered ? +((m.accepted / m.offered) * 100).toFixed(1) : null },
  ];
}

function emailMetrics(): MetricField[] {
  return [
    { key: "sent", label: "Sent", type: "number" },
    { key: "opened", label: "Opened", type: "number" },
    { key: "clicked", label: "Clicked", type: "number" },
    { key: "open_rate", label: "Open Rate %", type: "percentage", computed: (m) => m.sent ? +((m.opened / m.sent) * 100).toFixed(1) : null },
    { key: "click_rate", label: "Click Rate %", type: "percentage", computed: (m) => m.sent ? +((m.clicked / m.sent) * 100).toFixed(1) : null },
  ];
}
