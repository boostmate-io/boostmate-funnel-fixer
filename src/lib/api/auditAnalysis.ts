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

export async function createSalesCopyAsset(
  userId: string,
  projectId: string | null,
  assetName: string,
  sections: AnalysisSection[]
): Promise<string | null> {
  if (sections.length === 0) return null;

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      type: "sales_copy",
      name: assetName,
      project_id: projectId,
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    console.error("Error creating sales copy asset:", assetError);
    return null;
  }

  const sectionRows = sections.map((s, i) => ({
    asset_id: asset.id,
    title: s.title,
    content: s.content,
    sort_order: i,
  }));

  const { error: sectionsError } = await supabase
    .from("asset_sections")
    .insert(sectionRows);

  if (sectionsError) {
    console.error("Error creating asset sections:", sectionsError);
  }

  return asset.id;
}

export async function createFunnelFromAnalysis(
  userId: string,
  subAccountId: string | null,
  funnelName: string,
  nodes: FunnelNode[],
  edges: FunnelEdge[],
  salesCopyAssetId: string | null
): Promise<string | null> {
  if (nodes.length === 0) return null;

  if (salesCopyAssetId) {
    const firstPageNode = nodes.find((n) => n.type === "funnelPage");
    if (firstPageNode) {
      firstPageNode.data.linkedAssetId = salesCopyAssetId;
    }
  }

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
