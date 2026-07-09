import { supabase } from "@/integrations/supabase/client";

interface AnalysisSection {
  title: string;
  content: string;
}

interface FunnelNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FunnelEdge {
  id: string;
  source: string;
  target: string;
}

interface AuditAnalysisResult {
  sections: AnalysisSection[];
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

export async function analyzeAudit(
  screenshot: string,
  markdown: string,
  funnelStrategy: string,
  trafficSource: string
): Promise<AuditAnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-audit", {
    body: { screenshot, markdown, funnelStrategy, trafficSource },
  });

  if (error || !data?.success) {
    console.error("Audit analysis failed:", error || data?.error);
    return { sections: [], nodes: [], edges: [] };
  }

  return {
    sections: data.sections || [],
    nodes: data.nodes || [],
    edges: data.edges || [],
  };
}

export async function createFunnelFromAnalysis(
  userId: string,
  subAccountId: string | null,
  funnelName: string,
  nodes: FunnelNode[],
  edges: FunnelEdge[],
  sections: AnalysisSection[] = []
): Promise<string | null> {
  if (nodes.length === 0) return null;

  // Note: audit-generated sections are no longer attached to funnel nodes.
  // Copy is now managed via Copy Frameworks + Copy Documents linked to nodes.
  void sections;

  const { data: funnel, error } = await supabase
    .from("funnels")
    .insert({
      user_id: userId,
      name: funnelName,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      is_template: false,
      sub_account_id: subAccountId,
    })
    .select("id")
    .single();

  if (error || !funnel) {
    console.error("Error creating funnel:", error);
    return null;
  }

  return funnel.id;
}

