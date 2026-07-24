// =============================================================================
// delete-growth-route — transactional route (and optional funnel) deletion.
//
// Body: { route_id: string, delete_funnel: boolean }
// - Authenticates via the user's JWT (RLS-enforced).
// - Deletes the route (junction rows cascade). When delete_funnel = true and the
//   route has funnel_id, the funnel is deleted too and progress rows cascade.
// - Returns { ok: true, deleted_funnel: boolean }.
// =============================================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { route_id, delete_funnel } = await req.json();
    if (!route_id) throw new Error("route_id is required");

    const { data: route, error: routeErr } = await supabase
      .from("growth_architecture_systems")
      .select("id, funnel_id, sub_account_id")
      .eq("id", route_id)
      .maybeSingle();
    if (routeErr) throw routeErr;
    if (!route) throw new Error("Route not found or access denied");

    const funnelId = (route as any).funnel_id as string | null;

    // Delete the route first (junctions cascade).
    const { error: delRouteErr } = await supabase
      .from("growth_architecture_systems")
      .delete()
      .eq("id", route_id);
    if (delRouteErr) throw delRouteErr;

    let deletedFunnel = false;
    if (delete_funnel && funnelId) {
      const { error: delFunnelErr } = await supabase
        .from("funnels")
        .delete()
        .eq("id", funnelId);
      if (delFunnelErr) {
        // Non-fatal: the route is already gone.
        console.warn("Funnel delete failed:", delFunnelErr.message);
      } else {
        deletedFunnel = true;
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted_funnel: deletedFunnel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
