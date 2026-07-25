// =============================================================================
// Growth Architecture V2.1 — Funnel Container data layer.
//
// - useWorkspaceFunnels: all funnels in the active workspace (with status).
// - useFunnelConnections: funnel_connections CRUD for the workspace.
// - useFunnelTrafficSources: external traffic sources encoded as
//   trafficSource nodes inside a funnel's nodes JSON. Provides add/remove
//   helpers that mutate funnels.nodes/edges directly and wire each new
//   external source to the funnel's entry node.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FunnelStatus = "building" | "live" | "paused" | "archived";

export interface WorkspaceFunnelRow {
  id: string;
  name: string;
  status: FunnelStatus;
  linked_offer_id: string | null;
  nodes: any[];
  edges: any[];
  updated_at: string;
}

export interface FunnelConnectionRow {
  id: string;
  sub_account_id: string;
  source_funnel_id: string;
  target_funnel_id: string;
  sort_order: number;
}

// ---------- useWorkspaceFunnels --------------------------------------------

export function useWorkspaceFunnels(subAccountId: string | null) {
  const [rows, setRows] = useState<WorkspaceFunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!subAccountId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("funnels")
      .select("id,name,status,linked_offer_id,nodes,edges,updated_at")
      .eq("sub_account_id", subAccountId)
      .eq("is_template", false)
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Could not load funnels"); return; }
    setRows(
      (data ?? []).map((r: any) => ({
        ...r,
        nodes: Array.isArray(r.nodes) ? r.nodes : [],
        edges: Array.isArray(r.edges) ? r.edges : [],
        status: (r.status ?? "building") as FunnelStatus,
      })),
    );
  }, [subAccountId]);

  useEffect(() => { void load(); }, [load]);

  const setStatus = useCallback(async (funnelId: string, status: FunnelStatus) => {
    setRows((prev) => prev.map((f) => (f.id === funnelId ? { ...f, status } : f)));
    const { error } = await supabase.from("funnels").update({ status }).eq("id", funnelId);
    if (error) { toast.error("Could not update status"); await load(); }
  }, [load]);

  return { rows, loading, reload: load, setStatus };
}

// ---------- useFunnelConnections -------------------------------------------

export function useFunnelConnections(subAccountId: string | null) {
  const [rows, setRows] = useState<FunnelConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!subAccountId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("funnel_connections")
      .select("id,sub_account_id,source_funnel_id,target_funnel_id,sort_order")
      .eq("sub_account_id", subAccountId)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) { toast.error("Could not load funnel connections"); return; }
    setRows((data ?? []) as FunnelConnectionRow[]);
  }, [subAccountId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (sourceFunnelId: string, targetFunnelId: string) => {
    if (!subAccountId || sourceFunnelId === targetFunnelId) return null;
    const { data, error } = await supabase
      .from("funnel_connections")
      .insert({
        sub_account_id: subAccountId,
        source_funnel_id: sourceFunnelId,
        target_funnel_id: targetFunnelId,
      } as any)
      .select("id,sub_account_id,source_funnel_id,target_funnel_id,sort_order")
      .single();
    if (error) {
      if (!/duplicate/i.test(error.message)) toast.error("Could not add connection");
      return null;
    }
    setRows((prev) => [...prev, data as FunnelConnectionRow]);
    return data as FunnelConnectionRow;
  }, [subAccountId]);

  const remove = useCallback(async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("funnel_connections").delete().eq("id", id);
    if (error) { toast.error("Could not remove connection"); await load(); }
  }, [load]);

  const removeBetween = useCallback(async (sourceFunnelId: string, targetFunnelId: string) => {
    setRows((prev) => prev.filter(
      (r) => !(r.source_funnel_id === sourceFunnelId && r.target_funnel_id === targetFunnelId),
    ));
    const { error } = await supabase
      .from("funnel_connections")
      .delete()
      .eq("source_funnel_id", sourceFunnelId)
      .eq("target_funnel_id", targetFunnelId);
    if (error) { toast.error("Could not remove connection"); await load(); }
  }, [load]);

  const byTarget = useMemo(() => {
    const map = new Map<string, FunnelConnectionRow[]>();
    for (const r of rows) {
      const arr = map.get(r.target_funnel_id) ?? [];
      arr.push(r);
      map.set(r.target_funnel_id, arr);
    }
    return map;
  }, [rows]);

  return { rows, loading, add, remove, removeBetween, byTarget, reload: load };
}

// ---------- Traffic source helpers (funnel.nodes) ---------------------------

export interface FunnelExternalSource {
  nodeId: string;
  label: string;
  channelKey: string | null;
  icon: string | null;
  color: string | null;
}

export function extractExternalSources(nodes: any[]): FunnelExternalSource[] {
  return (nodes ?? [])
    .filter((n) => n && n.type === "trafficSource")
    .map((n) => ({
      nodeId: n.id,
      label: n.data?.label ?? "Traffic source",
      channelKey: n.data?.channelKey ?? null,
      icon: n.data?.icon ?? null,
      color: n.data?.color ?? null,
    }));
}

function findEntryNodeId(nodes: any[], edges: any[]): string | null {
  const targeted = new Set((edges ?? []).map((e) => e?.target).filter(Boolean));
  const roots = (nodes ?? []).filter(
    (n) => n?.id && n?.type !== "trafficSource" && !targeted.has(n.id),
  );
  return roots[0]?.id ?? (nodes ?? []).find((n) => n?.type !== "trafficSource")?.id ?? null;
}

/**
 * Add or remove a trafficSource node inside a funnel's nodes JSON.
 * When adding, wires the new node to the funnel's detected entry node.
 * Persists the updated nodes/edges to the funnels row.
 */
export async function addFunnelExternalSource(
  funnel: WorkspaceFunnelRow,
  channel: { id: string; key: string; label: string; icon: string | null; color: string | null },
): Promise<{ nodes: any[]; edges: any[] } | null> {
  const nodes = Array.isArray(funnel.nodes) ? [...funnel.nodes] : [];
  const edges = Array.isArray(funnel.edges) ? [...funnel.edges] : [];

  // Dedup by channelKey or label match.
  const dup = nodes.some(
    (n) => n?.type === "trafficSource" &&
      ((n?.data?.channelKey && n.data.channelKey === channel.key) ||
       (n?.data?.label && String(n.data.label).toLowerCase() === channel.label.toLowerCase())),
  );
  if (dup) return { nodes, edges };

  const entryId = findEntryNodeId(nodes, edges);
  const entryNode = entryId ? nodes.find((n) => n.id === entryId) : null;
  const pos = entryNode?.position ?? { x: 0, y: 0 };
  const offsetY = nodes.filter((n) => n?.type === "trafficSource").length * 140;

  const trafficId = crypto.randomUUID();
  nodes.push({
    id: trafficId,
    type: "trafficSource",
    position: { x: (pos.x ?? 0) - 260, y: (pos.y ?? 0) + offsetY },
    data: {
      label: channel.label,
      icon: channel.icon ?? "Globe",
      color: channel.color ?? "#6246ff",
      channelKey: channel.key,
    },
  });
  if (entryId) {
    edges.push({
      id: `e-${trafficId}-${entryId}`,
      source: trafficId,
      target: entryId,
      type: "smoothstep",
    });
  }

  const { error } = await supabase.from("funnels").update({ nodes, edges }).eq("id", funnel.id);
  if (error) { toast.error("Could not add traffic source"); return null; }
  return { nodes, edges };
}

export async function removeFunnelExternalSource(
  funnel: WorkspaceFunnelRow,
  nodeId: string,
): Promise<{ nodes: any[]; edges: any[] } | null> {
  const nodes = (Array.isArray(funnel.nodes) ? funnel.nodes : []).filter((n) => n?.id !== nodeId);
  const edges = (Array.isArray(funnel.edges) ? funnel.edges : []).filter(
    (e) => e?.source !== nodeId && e?.target !== nodeId,
  );
  const { error } = await supabase.from("funnels").update({ nodes, edges }).eq("id", funnel.id);
  if (error) { toast.error("Could not remove traffic source"); return null; }
  return { nodes, edges };
}
