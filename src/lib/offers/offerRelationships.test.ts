// Phase 1 offer relationships: registry metadata, filtering, hook guards, error mapping.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const insertSpy = vi.fn();
let selectRows: any[] = [];
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: async () => ({ data: selectRows, error: null }) }),
      insert: (row: any) => ({ select: () => ({ single: () => insertSpy(row) }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

import {
  useOfferRelationships, incomingRelationships, outgoingRelationships, relationshipErrorReason,
} from "@/lib/growth-architecture/hooks";
import { OFFER_RELATIONSHIP_TYPES, OFFER_TIER_RELATIONSHIPS, offerRelationshipSlots, OFFER_TIER_LAYOUTS } from "@shared/blueprintRegistry";

const r = (id: string, s: string, t: string, type = "ascends_to") =>
  ({ id, sub_account_id: "ws", source_offer_id: s, target_offer_id: t, relationship_type: type as any, notes: null });

beforeEach(() => { insertSpy.mockReset(); selectRows = []; });

describe("filtering", () => {
  const rows = [r("1", "a", "b"), r("2", "a", "c", "downsell"), r("3", "c", "a", "leads_into"), r("4", "b", "a")];
  it("multiple incoming and outgoing; cycles allowed", () => {
    expect(outgoingRelationships(rows, "a").map((x) => x.id)).toEqual(["1", "2"]);
    expect(incomingRelationships(rows, "a").map((x) => x.id)).toEqual(["3", "4"]);
  });
});

describe("hook", () => {
  it("creates, blocks duplicates/self locally, removes", async () => {
    const { result } = renderHook(() => useOfferRelationships("ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    insertSpy.mockResolvedValueOnce({ data: r("n1", "a", "b"), error: null });
    let id: string | null = null;
    await act(async () => { id = await result.current.add({ source_offer_id: "a", target_offer_id: "b", relationship_type: "ascends_to" }); });
    expect(id).toBe("n1");
    await act(async () => { await result.current.add({ source_offer_id: "a", target_offer_id: "b", relationship_type: "ascends_to" }); });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(result.current.lastError).toBe("duplicate");
    await act(async () => { await result.current.add({ source_offer_id: "a", target_offer_id: "a", relationship_type: "ascends_to" }); });
    expect(result.current.lastError).toBe("self");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(result.current.outgoing("a")).toHaveLength(1);
    expect(result.current.incoming("b")).toHaveLength(1);
    await act(async () => { await result.current.remove("n1"); });
    expect(result.current.rows).toHaveLength(0);
  });
  it("ignores concurrent duplicate submissions", async () => {
    const { result } = renderHook(() => useOfferRelationships("ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let resolve: (v: any) => void = () => {};
    insertSpy.mockReturnValueOnce(new Promise((res) => { resolve = res; }));
    const p = { source_offer_id: "a", target_offer_id: "b", relationship_type: "ascends_to" as const };
    await act(async () => {
      const first = result.current.add(p);
      const second = await result.current.add(p);
      expect(second).toBeNull();
      resolve({ data: r("n1", "a", "b"), error: null });
      await first;
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });
  it("surfaces database rejections as reasons", async () => {
    const { result } = renderHook(() => useOfferRelationships("ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    insertSpy.mockResolvedValueOnce({ data: null, error: { code: "23514", message: "Target offer does not belong to this workspace" } });
    await act(async () => { await result.current.add({ source_offer_id: "a", target_offer_id: "x", relationship_type: "ascends_to" }); });
    expect(result.current.lastError).toBe("cross_workspace");
  });
});

describe("error mapping", () => {
  it("maps database errors", () => {
    expect(relationshipErrorReason({ code: "23505", message: "duplicate key" })).toBe("duplicate");
    expect(relationshipErrorReason({ code: "23514", message: 'violates check constraint "offer_relationships_no_self"' })).toBe("self");
    expect(relationshipErrorReason({ code: "42501", message: "new row violates row-level security policy" })).toBe("forbidden");
  });
});

describe("registry metadata", () => {
  it("defines direction labels for all four types", () => {
    expect(Object.keys(OFFER_RELATIONSHIP_TYPES).sort()).toEqual(["ascends_to", "downsell", "leads_into", "retention"]);
    for (const t of Object.values(OFFER_RELATIONSHIP_TYPES)) { expect(t.incoming).toBeTruthy(); expect(t.outgoing).toBeTruthy(); }
  });
  it("every tier including Core has slots with valid direction", () => {
    for (const tier of Object.keys(OFFER_TIER_LAYOUTS) as any[]) {
      const slots = offerRelationshipSlots(tier);
      expect(slots.length).toBeGreaterThan(0);
      for (const s of slots) expect(["incoming", "outgoing"]).toContain(s.direction);
    }
  });
  it("existing placeholders map to the approved directions", () => {
    const find = (tier: any, label: string) => OFFER_TIER_RELATIONSHIPS[tier as keyof typeof OFFER_TIER_RELATIONSHIPS].find((s) => s.label === label);
    expect(find("free", "Leads into")).toMatchObject({ relationship: "leads_into", direction: "outgoing" });
    expect(find("low_ticket", "Ascends to")).toMatchObject({ relationship: "ascends_to", direction: "outgoing" });
    expect(find("mid_ticket", "Downsell from")).toMatchObject({ relationship: "downsell", direction: "incoming" });
    expect(find("premium", "Upgrades from")).toMatchObject({ relationship: "ascends_to", direction: "incoming" });
    expect(find("continuity", "Retention for")).toMatchObject({ relationship: "retention", direction: "incoming" });
  });
});
