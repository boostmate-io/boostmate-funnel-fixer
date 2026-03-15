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

const AVAILABLE_PAGE_TYPES = [
  "opt-in", "squeeze", "bridge", "sales", "webinar", "application",
  "calendar", "tripwire", "order-form", "checkout", "upsell",
  "downsell", "confirmation", "thank-you", "membership",
];

const AVAILABLE_TRAFFIC_TYPES = [
  "youtube", "instagram", "facebook", "tiktok", "google", "email", "podcast", "affiliate",
];

const PAGE_META: Record<string, { label: string; icon: string; color: string }> = {
  "opt-in": { label: "funnelDesigner.pages.optIn", icon: "FileText", color: "#3B82F6" },
  "squeeze": { label: "funnelDesigner.pages.squeeze", icon: "Zap", color: "#8B5CF6" },
  "bridge": { label: "funnelDesigner.pages.bridge", icon: "ArrowRight", color: "#10B981" },
  "sales": { label: "funnelDesigner.pages.sales", icon: "FileText", color: "#F59E0B" },
  "webinar": { label: "funnelDesigner.pages.webinar", icon: "Video", color: "#EC4899" },
  "application": { label: "funnelDesigner.pages.application", icon: "ClipboardList", color: "#EF4444" },
  "calendar": { label: "funnelDesigner.pages.calendar", icon: "Calendar", color: "#6366F1" },
  "tripwire": { label: "funnelDesigner.pages.tripwire", icon: "Zap", color: "#F43F5E" },
  "order-form": { label: "funnelDesigner.pages.orderForm", icon: "ShoppingCart", color: "#14B8A6" },
  "checkout": { label: "funnelDesigner.pages.checkout", icon: "CreditCard", color: "#0EA5E9" },
  "upsell": { label: "funnelDesigner.pages.upsell", icon: "TrendingUp", color: "#22C55E" },
  "downsell": { label: "funnelDesigner.pages.downsell", icon: "TrendingDown", color: "#F97316" },
  "confirmation": { label: "funnelDesigner.pages.confirmation", icon: "CheckCircle", color: "#10B981" },
  "thank-you": { label: "funnelDesigner.pages.thankYou", icon: "Heart", color: "#EC4899" },
  "membership": { label: "funnelDesigner.pages.membership", icon: "Users", color: "#6366F1" },
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshot, markdown, funnelStrategy, trafficSource } = await req.json();

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Task 1: Analyze screenshot for sections
    let sections: Section[] = [];
    if (screenshot) {
      const screenshotUrl = screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`;

      const sectionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a landing page analyst. Analyze the screenshot of a landing page and identify the distinct visual sections. For each section, provide a descriptive title and extract the text content visible in that section. Use the provided markdown as a reference for the text content.

Return JSON only, no markdown formatting. Format:
{"sections": [{"title": "Section title", "content": "The text content of this section"}]}`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: screenshotUrl },
                },
                {
                  type: 'text',
                  text: `Here is the markdown content of the page for reference:\n\n${markdown || '(no markdown available)'}\n\nAnalyze the screenshot and identify the visual sections with their content.`,
                },
              ],
            },
          ],
          temperature: 0.3,
        }),
      });

      const sectionData = await sectionResponse.json();
      const sectionText = sectionData.choices?.[0]?.message?.content || '';
      
      try {
        const cleaned = sectionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        sections = parsed.sections || [];
      } catch (e) {
        console.error('Failed to parse sections:', e, sectionText);
      }
    }

    // Task 2: Generate funnel from strategy
    let nodes: FunnelNode[] = [];
    let edges: FunnelEdge[] = [];

    const funnelPrompt = funnelStrategy?.trim()
      ? `Based on this funnel strategy description, create a funnel structure:

Strategy: "${funnelStrategy}"
Traffic source: "${trafficSource || 'unknown'}"

Available page types: ${AVAILABLE_PAGE_TYPES.join(', ')}
Available traffic source types: ${AVAILABLE_TRAFFIC_TYPES.join(', ')}

Create a funnel with appropriate traffic source(s) and page nodes connected in a logical flow.
Return JSON only, no markdown formatting. Format:
{
  "trafficSources": ["type1"],
  "pages": ["type1", "type2", "type3"]
}

Choose the page types that best match the described strategy. If the strategy is unclear, use just ["sales"].`
      : null;

    if (funnelPrompt) {
      const funnelResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a funnel strategy expert. Return only valid JSON.' },
            { role: 'user', content: funnelPrompt },
          ],
          temperature: 0.3,
        }),
      });

      const funnelData = await funnelResponse.json();
      const funnelText = funnelData.choices?.[0]?.message?.content || '';

      try {
        const cleaned = funnelText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const trafficSources: string[] = parsed.trafficSources || [];
        const pages: string[] = parsed.pages || ['sales'];

        // Build nodes
        let nodeIdx = 0;

        // Traffic source nodes
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

        // Page nodes
        for (let i = 0; i < pages.length; i++) {
          const pageType = pages[i];
          const meta = PAGE_META[pageType];
          if (!meta) continue;
          nodes.push({
            id: `node_audit_${nodeIdx}`,
            type: 'funnelPage',
            position: { x: 300 + i * 220, y: 150 },
            data: { label: meta.label, pageType, icon: meta.icon, color: meta.color },
          });
          nodeIdx++;
        }

        // Edges: traffic sources → first page
        const firstPageId = trafficNodeCount < nodes.length ? nodes[trafficNodeCount].id : null;
        for (let i = 0; i < trafficNodeCount; i++) {
          if (firstPageId) {
            edges.push({
              id: `edge_audit_${i}`,
              source: nodes[i].id,
              target: firstPageId,
            });
          }
        }

        // Edges: pages connected sequentially
        for (let i = trafficNodeCount; i < nodes.length - 1; i++) {
          edges.push({
            id: `edge_audit_${edges.length}`,
            source: nodes[i].id,
            target: nodes[i + 1].id,
          });
        }
      } catch (e) {
        console.error('Failed to parse funnel:', e, funnelText);
      }
    }

    // Fallback: if no funnel nodes, create a simple sales page
    if (nodes.length === 0) {
      const salesMeta = PAGE_META['sales'];
      nodes = [{
        id: 'node_audit_0',
        type: 'funnelPage',
        position: { x: 300, y: 150 },
        data: { label: salesMeta.label, pageType: 'sales', icon: salesMeta.icon, color: salesMeta.color },
      }];

      // Try to add traffic source if specified
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
