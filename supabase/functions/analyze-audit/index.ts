const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Section {
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

const AVAILABLE_TRAFFIC_TYPES = [
  "youtube", "instagram", "facebook", "tiktok", "google", "email", "podcast", "affiliate",
];

const PAGE_META: Record<string, { label: string; icon: string; color: string }> = {
  "opt-in": { label: "funnelDesigner.elements.optIn", icon: "FileText", color: "#3B82F6" },
  "squeeze": { label: "funnelDesigner.elements.squeeze", icon: "Zap", color: "#8B5CF6" },
  "bridge": { label: "funnelDesigner.elements.bridge", icon: "ArrowRight", color: "#10B981" },
  "sales": { label: "funnelDesigner.elements.sales", icon: "FileText", color: "#F59E0B" },
  "webinar": { label: "funnelDesigner.elements.webinar", icon: "Video", color: "#EC4899" },
  "application": { label: "funnelDesigner.elements.application", icon: "ClipboardList", color: "#EF4444" },
  "calendar": { label: "funnelDesigner.elements.calendar", icon: "Calendar", color: "#6366F1" },
  "tripwire": { label: "funnelDesigner.elements.tripwire", icon: "Zap", color: "#F43F5E" },
  "order-form": { label: "funnelDesigner.elements.orderForm", icon: "ShoppingCart", color: "#14B8A6" },
  "checkout": { label: "funnelDesigner.elements.checkout", icon: "CreditCard", color: "#0EA5E9" },
  "upsell": { label: "funnelDesigner.elements.upsell", icon: "TrendingUp", color: "#22C55E" },
  "downsell": { label: "funnelDesigner.elements.downsell", icon: "TrendingDown", color: "#F97316" },
  "confirmation": { label: "funnelDesigner.elements.confirmation", icon: "CheckCircle", color: "#10B981" },
  "thank-you": { label: "funnelDesigner.elements.thankYou", icon: "Heart", color: "#EC4899" },
  "membership": { label: "funnelDesigner.elements.membership", icon: "Users", color: "#6366F1" },
};

const TRAFFIC_META: Record<string, { label: string; icon: string; color: string }> = {
  "youtube": { label: "YouTube", icon: "Youtube", color: "#FF0000" },
  "instagram": { label: "Instagram", icon: "Instagram", color: "#E1306C" },
  "facebook": { label: "Facebook", icon: "Facebook", color: "#1877F2" },
  "tiktok": { label: "Music", icon: "Music", color: "#000000" },
  "google": { label: "Google", icon: "Search", color: "#4285F4" },
  "email": { label: "Email", icon: "Mail", color: "#34A853" },
  "podcast": { label: "Podcast", icon: "Podcast", color: "#8B5CF6" },
  "affiliate": { label: "Affiliate", icon: "Users", color: "#F59E0B" },
};

async function callAIAction(
  supabaseUrl: string,
  authHeader: string,
  anonKey: string,
  slug: string,
  inputs: Record<string, unknown>,
  imageInputs?: string[],
): Promise<Record<string, any> | null> {
  const resp = await fetch(`${supabaseUrl}/functions/v1/execute-ai-action`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug, inputs, image_inputs: imageInputs }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    console.error(`AI action ${slug} failed:`, resp.status, t);
    return null;
  }
  const json = await resp.json();
  return json.output || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshot, markdown, funnelStrategy, trafficSource } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || `Bearer ${anonKey}`;

    // Task 1: Section analysis via admin AI Action
    let sections: Section[] = [];
    if (screenshot) {
      const out = await callAIAction(
        supabaseUrl, authHeader, anonKey,
        'audit_section_analysis',
        { markdown: markdown || '(no markdown available)' },
        [screenshot],
      );
      if (out && Array.isArray(out.sections)) {
        sections = out.sections as Section[];
      }
    }

    // Task 2: Funnel structure via admin AI Action
    let nodes: FunnelNode[] = [];
    let edges: FunnelEdge[] = [];

    if (funnelStrategy?.trim()) {
      const out = await callAIAction(
        supabaseUrl, authHeader, anonKey,
        'audit_funnel_from_strategy',
        { funnel_strategy: funnelStrategy, traffic_source: trafficSource || 'unknown' },
      );

      const trafficSources: string[] = (out?.traffic_sources as string[]) || [];
      const pages: string[] = (out?.pages as string[]) || ['sales'];

      let nodeIdx = 0;

      for (const ts of trafficSources) {
        const meta = TRAFFIC_META[ts];
        if (!meta) continue;
        nodes.push({
          id: `node_audit_${nodeIdx}`,
          type: 'trafficSource',
          position: { x: 50, y: 100 + nodeIdx * 120 },
          data: { label: meta.label, icon: meta.icon, color: meta.color },
        });
        nodeIdx++;
      }

      const trafficNodeCount = nodes.length;

      for (let i = 0; i < pages.length; i++) {
        const meta = PAGE_META[pages[i]];
        if (!meta) continue;
        nodes.push({
          id: `node_audit_${nodeIdx}`,
          type: 'funnelPage',
          position: { x: 300 + i * 220, y: 150 },
          data: { label: meta.label, pageType: pages[i], icon: meta.icon, color: meta.color },
        });
        nodeIdx++;
      }

      const firstPageId = trafficNodeCount < nodes.length ? nodes[trafficNodeCount].id : null;
      for (let i = 0; i < trafficNodeCount; i++) {
        if (firstPageId) {
          edges.push({ id: `edge_audit_${i}`, source: nodes[i].id, target: firstPageId });
        }
      }
      for (let i = trafficNodeCount; i < nodes.length - 1; i++) {
        edges.push({ id: `edge_audit_${edges.length}`, source: nodes[i].id, target: nodes[i + 1].id });
      }
    }

    // Fallback
    if (nodes.length === 0) {
      const salesMeta = PAGE_META['sales'];
      nodes = [{
        id: 'node_audit_0',
        type: 'funnelPage',
        position: { x: 300, y: 150 },
        data: { label: salesMeta.label, pageType: 'sales', icon: salesMeta.icon, color: salesMeta.color },
      }];

      if (trafficSource) {
        const tsLower = trafficSource.toLowerCase();
        const matchedTraffic = AVAILABLE_TRAFFIC_TYPES.find(t => tsLower.includes(t));
        if (matchedTraffic) {
          const meta = TRAFFIC_META[matchedTraffic];
          nodes.unshift({
            id: 'node_audit_traffic',
            type: 'trafficSource',
            position: { x: 50, y: 150 },
            data: { label: meta.label, icon: meta.icon, color: meta.color },
          });
          edges = [{ id: 'edge_audit_0', source: 'node_audit_traffic', target: 'node_audit_0' }];
        }
      }
    }

    console.log(`Analysis complete: ${sections.length} sections, ${nodes.length} funnel nodes`);

    return new Response(
      JSON.stringify({ success: true, sections, nodes, edges }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-audit:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
