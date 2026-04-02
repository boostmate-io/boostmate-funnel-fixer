import { AuditResult, FunnelDiagram } from "@/types/audit";

export const mockCurrentFunnel: FunnelDiagram = {
  nodes: [
    {
      id: "traffic-1",
      type: "trafficSource",
      position: { x: 0, y: 80 },
      data: { label: "Facebook", icon: "Facebook", color: "#1877F2" },
    },
    {
      id: "traffic-2",
      type: "trafficSource",
      position: { x: 0, y: 200 },
      data: { label: "Instagram", icon: "Instagram", color: "#E1306C" },
    },
    {
      id: "page-1",
      type: "funnelNode",
      position: { x: 200, y: 50 },
      data: { label: "funnelDesigner.elements.optIn", pageType: "opt-in", icon: "FileText", color: "#3B82F6" },
    },
    {
      id: "page-2",
      type: "funnelNode",
      position: { x: 450, y: 50 },
      data: { label: "funnelDesigner.elements.webinar", pageType: "webinar", icon: "Video", color: "#EC4899" },
    },
    {
      id: "page-3",
      type: "funnelNode",
      position: { x: 700, y: 50 },
      data: { label: "funnelDesigner.elements.sales", pageType: "sales", icon: "FileText", color: "#F59E0B" },
    },
  ],
  edges: [
    { id: "e1", source: "traffic-1", target: "page-1" },
    { id: "e2", source: "traffic-2", target: "page-1" },
    { id: "e3", source: "page-1", target: "page-2" },
    { id: "e4", source: "page-2", target: "page-3" },
  ],
};

export const mockOptimizedFunnel: FunnelDiagram = {
  nodes: [
    {
      id: "traffic-1",
      type: "trafficSource",
      position: { x: 0, y: 80 },
      data: { label: "Facebook", icon: "Facebook", color: "#1877F2" },
    },
    {
      id: "traffic-2",
      type: "trafficSource",
      position: { x: 0, y: 200 },
      data: { label: "Instagram", icon: "Instagram", color: "#E1306C" },
    },
    {
      id: "page-1",
      type: "funnelNode",
      position: { x: 200, y: 50 },
      data: { label: "funnelDesigner.elements.squeeze", pageType: "squeeze", icon: "Zap", color: "#8B5CF6" },
    },
    {
      id: "page-2",
      type: "funnelNode",
      position: { x: 450, y: 50 },
      data: { label: "funnelDesigner.elements.bridge", pageType: "bridge", icon: "ArrowRight", color: "#10B981" },
    },
    {
      id: "page-3",
      type: "funnelNode",
      position: { x: 700, y: 50 },
      data: { label: "funnelDesigner.elements.calendar", pageType: "calendar", icon: "Calendar", color: "#6366F1" },
    },
    {
      id: "page-4",
      type: "funnelNode",
      position: { x: 700, y: 200 },
      data: { label: "funnelDesigner.elements.thankYou", pageType: "thank-you", icon: "Heart", color: "#EC4899" },
    },
  ],
  edges: [
    { id: "e1", source: "traffic-1", target: "page-1" },
    { id: "e2", source: "traffic-2", target: "page-1" },
    { id: "e3", source: "page-1", target: "page-2" },
    { id: "e4", source: "page-2", target: "page-3" },
    { id: "e5", source: "page-3", target: "page-4" },
  ],
};

export const mockResult: AuditResult = {
  score: 42,
  positives: [
    "You have a clearly defined offer",
    "You're generating consistent traffic to your page",
    "You're using email as a follow-up channel",
  ],
  conversionLeaks: [
    {
      title: "Unclear value proposition above the fold",
      description: "Visitors don't understand within 5 seconds what your offer is and why it's relevant to them.",
      fix: "Rewrite your headline with a specific result + timeframe.",
    },
    {
      title: "No social proof visible",
      description: "Testimonials, case studies or results that build trust are missing.",
      fix: "Add at least 3 testimonials with name, photo and specific result.",
    },
    {
      title: "Too many steps to conversion",
      description: "Your funnel has too many friction points causing leads to drop off.",
      fix: "Simplify your funnel to maximum 3 steps.",
    },
  ],
  currentStrategy: {
    summary: "You're currently using a multi-step funnel with a webinar as an intermediate conversion.",
    problems: [
      "Webinar show-up rate is typically low (15-25%)",
      "Too long a sales cycle for an offer under €5,000",
      "No urgency or scarcity built in",
    ],
  },
  optimizedStrategy: {
    summary: "A direct VSL funnel with a strategy call as conversion event delivers faster results.",
    steps: [
      "Replace the webinar with a 15-min Video Sales Letter",
      "Add an automated booking flow after the VSL",
      "Implement a 3-step email nurture for no-shows",
      "Use retargeting ads for page visitors who don't book",
    ],
  },
  currentFunnel: mockCurrentFunnel,
  optimizedFunnel: mockOptimizedFunnel,
};
