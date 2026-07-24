// =============================================================================
// start-building-route — atomic route → funnel bootstrap.
//
// Input: { route_id: uuid }
//
// Flow:
//   1. Auth & membership check.
//   2. Idempotent: if route.funnel_id set, return it.
//   3. Load system + seed_template + target offer + all channels.
//   4. Auto-detect acquisition entry node: the single node with no incoming
//      edges. If several exist, pick the first — no explicit entry_node_id
//      configuration required.
//   5. Clone nodes/edges, inject one trafficSource per channel (dedup by key),
//      wire each to the entry node.
//   6. Insert funnel with descriptive name:
//        "<System> – <Offer> (<Primary Channel>)"
//   7. Clone brief (if any). Attach union of system + channel build guides.
//   8. Link route → funnel.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({ route_id: z.string().uuid() });

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(url, service);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "unauthorized" });
  const userId = userData.user.id;

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json(400, { error: parsed.error.flatten().fieldErrors });
  const { route_id } = parsed.data;

  // 1. Route
  const { data: route, error: rErr } = await admin
    .from("growth_architecture_systems")
    .select("id,sub_account_id,system_catalog_id,target_offer_id,funnel_id,notes")
    .eq("id", route_id)
    .maybeSingle();
  if (rErr || !route) return json(404, { error: "route_not_found" });

  const { data: isMember } = await admin.rpc("is_sub_account_member", {
    _user_id: userId, _sub_id: route.sub_account_id,
  });
  if (!isMember) return json(403, { error: "not_a_member" });

  // 2. Idempotent
  if (route.funnel_id) {
    return json(200, { funnel_id: route.funnel_id, status: "already_started" });
  }

  // 3. System / seed / offer / channels
  const { data: system, error: sErr } = await admin
    .from("growth_systems_catalog")
    .select("id,label,seed_template_id")
    .eq("id", route.system_catalog_id)
    .maybeSingle();
  if (sErr || !system) return json(404, { error: "system_not_found" });
  if (!system.seed_template_id) return json(422, { error: "system_missing_seed_template" });

  const { data: seed, error: seedErr } = await admin
    .from("seed_templates")
    .select("id,name,nodes,edges,brief_structure,template_type")
    .eq("id", system.seed_template_id)
    .maybeSingle();
  if (seedErr || !seed) return json(404, { error: "seed_template_not_found" });

  const { data: targetOffer } = await admin
    .from("offers")
    .select("id,name")
    .eq("id", route.target_offer_id)
    .maybeSingle();

  const { data: channelLinks } = await admin
    .from("growth_architecture_channels")
    .select("is_primary, sort_order, acquisition_channels:channel_id(id,key,label,icon,color)")
    .eq("architecture_system_id", route.id)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const channels = (channelLinks ?? [])
    .map((l: any) => ({ ...l.acquisition_channels, is_primary: !!l.is_primary }))
    .filter((c: any) => c && c.id);
  const primaryChannel = channels.find((c: any) => c.is_primary) ?? channels[0] ?? null;

  // 4. Clone + auto-detect entry node (single node with no incoming edges;
  //    if several, take the first — no explicit configuration required).
  const rawNodes: any[] = Array.isArray(seed.nodes) ? JSON.parse(JSON.stringify(seed.nodes)) : [];
  const rawEdges: any[] = Array.isArray(seed.edges) ? JSON.parse(JSON.stringify(seed.edges)) : [];

  let entryId: string | null = null;
  if (rawNodes.length > 0) {
    const targeted = new Set(rawEdges.map((e) => e?.target).filter(Boolean));
    const roots = rawNodes.filter(
      (n) => n?.id && n?.type !== "trafficSource" && !targeted.has(n.id),
    );
    entryId = roots[0]?.id ?? rawNodes[0]?.id ?? null;
  }

  // 5. Inject acquisition channels (dedup by key/label)
  if (channels.length > 0 && entryId) {
    const entryNode = rawNodes.find((n) => n.id === entryId);
    const pos = entryNode?.position ?? { x: 0, y: 0 };
    let offsetY = 0;
    channels.forEach((ch: any) => {
      const dup = rawNodes.some(
        (n) => n?.type === "trafficSource" &&
          ((n?.data?.channelKey && n.data.channelKey === ch.key) ||
           (n?.data?.label && String(n.data.label).toLowerCase() === String(ch.label).toLowerCase())),
      );
      if (dup) return;
      const trafficId = crypto.randomUUID();
      rawNodes.push({
        id: trafficId,
        type: "trafficSource",
        position: { x: (pos.x ?? 0) - 260, y: (pos.y ?? 0) + offsetY },
        data: {
          label: ch.label,
          icon: ch.icon ?? "Globe",
          color: ch.color ?? "#6246ff",
          channelKey: ch.key,
        },
      });
      rawEdges.push({
        id: `e-${trafficId}-${entryId}`,
        source: trafficId,
        target: entryId!,
        type: "smoothstep",
      });
      offsetY += 140;
    });
  }

  // 6. Descriptive funnel name (include all selected channels, primary first)
  const offerName = targetOffer?.name?.trim() || "Untitled Offer";
  const channelLabels = channels.map((c: any) => c.label).filter(Boolean);
  const funnelName = (
    channelLabels.length > 0
      ? `${system.label} – ${offerName} (${channelLabels.join(", ")})`
      : `${system.label} – ${offerName}`
  ).slice(0, 160);

  const { data: newFunnel, error: fErr } = await admin
    .from("funnels")
    .insert({
      user_id: userId,
      sub_account_id: route.sub_account_id,
      name: funnelName,
      nodes: rawNodes,
      edges: rawEdges,
      is_template: false,
      seed_template_id: seed.id,
      template_type: seed.template_type ?? null,
      linked_offer_id: route.target_offer_id ?? null,
    })
    .select("id")
    .single();
  if (fErr || !newFunnel) return json(500, { error: "funnel_create_failed", detail: fErr?.message });

  const funnelId = newFunnel.id as string;

  // 7. Brief
  if (seed.brief_structure && (seed.brief_structure as any)?.sections?.length > 0) {
    await admin.from("funnel_briefs").insert({
      funnel_id: funnelId,
      user_id: userId,
      sub_account_id: route.sub_account_id,
      structure: seed.brief_structure,
      values: {},
    });
  }

  // 8. Attach build guides (union of system + channel guides)
  const guideInserts: Array<{ funnel_id: string; build_guide_id: string; source: string; source_ref_id: string; sort_order: number }> = [];
  const seen = new Set<string>();

  const { data: sysGuides } = await admin
    .from("growth_system_build_guides")
    .select("build_guide_id, sort_order")
    .eq("growth_system_id", system.id)
    .order("sort_order", { ascending: true });
  for (const g of sysGuides ?? []) {
    const gid = (g as any).build_guide_id;
    if (seen.has(gid)) continue;
    seen.add(gid);
    guideInserts.push({
      funnel_id: funnelId,
      build_guide_id: gid,
      source: "growth_system",
      source_ref_id: system.id,
      sort_order: (g as any).sort_order ?? 0,
    });
  }

  for (const ch of channels) {
    const { data: chGuides } = await admin
      .from("acquisition_channel_build_guides")
      .select("build_guide_id, sort_order")
      .eq("acquisition_channel_id", (ch as any).id)
      .order("sort_order", { ascending: true });
    for (const g of chGuides ?? []) {
      const gid = (g as any).build_guide_id;
      if (seen.has(gid)) continue;
      seen.add(gid);
      guideInserts.push({
        funnel_id: funnelId,
        build_guide_id: gid,
        source: "acquisition_channel",
        source_ref_id: (ch as any).id,
        sort_order: (g as any).sort_order ?? 0,
      });
    }
  }

  let guidesAttached = 0;
  let guidesError: string | null = null;
  if (guideInserts.length > 0) {
    const { error: gErr, count } = await admin
      .from("funnel_build_guides")
      .insert(guideInserts, { count: "exact" });
    if (gErr) guidesError = gErr.message;
    else guidesAttached = count ?? guideInserts.length;
  }

  // 9. Link route → funnel
  await admin
    .from("growth_architecture_systems")
    .update({ funnel_id: funnelId })
    .eq("id", route.id);

  return json(200, {
    funnel_id: funnelId,
    funnel_name: funnelName,
    status: "started",
    guides_attached: guidesAttached,
    guides_error: guidesError,
    channels_injected: channels.length,
  });
});
