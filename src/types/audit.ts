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
