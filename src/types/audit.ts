export interface AuditFormData {
  targetAudience: string;
  offer: string;
  landingPageUrl: string;
  trafficSource: string;
  monthlyTraffic: string;
  conversionRate: string;
  funnelStrategy: string;
  email: string;
}

export interface ConversionLeak {
  title: string;
  description: string;
  fix: string;
}

export interface FunnelNodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FunnelEdgeData {
  id: string;
  source: string;
  target: string;
}

export interface FunnelDiagram {
  nodes: FunnelNodeData[];
  edges: FunnelEdgeData[];
}

export interface AuditResult {
  score: number;
  positives: string[];
  conversionLeaks: ConversionLeak[];
  currentStrategy: {
    summary: string;
    problems: string[];
  };
  optimizedStrategy: {
    summary: string;
    steps: string[];
  };
  currentFunnel?: FunnelDiagram;
  optimizedFunnel?: FunnelDiagram;
}

export const initialFormData: AuditFormData = {
  targetAudience: "",
  offer: "",
  landingPageUrl: "",
  trafficSource: "",
  monthlyTraffic: "",
  conversionRate: "",
  funnelStrategy: "",
  email: "",
};
