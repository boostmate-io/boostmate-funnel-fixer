// Phase 3: card relationship summaries, Customer Journey overview,
// inline relationship creation in route creation, cross-module refresh.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react";

const db: { rows: any[]; insertError: any } = { rows: [], insertError: null };
const insertSpy = vi.fn();
vi.mock("@/integrations/supabase/client", () => {
  const q = (table: string) => {
    const api: any = {
      select: () => api, eq: () => api, order: () => api,
      insert: (p: any) => { insertSpy(table, p); api._ins = p; return api; },
      delete: () => ({ eq: async () => ({ error: null }) }),
      single: async () => db.insertError ? { data: null, error: db.insertError } : { data: { id: `new-${insertSpy.mock.calls.length}`, notes: null, ...api._ins }, error: null },
      then: (res: any) => res({ data: table === "offer_relationships" ? db.rows : [], error: null }),
    };
    return api;
  };
  return { supabase: { from: q } };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws" }), useOptionalWorkspace: () => ({ activeSubAccountId: "ws" }) }));

import { summarizeOfferRelationships, edgesInCycles } from "@/lib/offers/relationshipSummary";
import CustomerJourneyOverview from "./CustomerJourneyOverview";
import OfferSummaryCard from "./OfferSummaryCard";
import AddRouteDialog from "../growth-architecture/AddRouteDialog";
import { useOfferRelationships } from "@/lib/growth-architecture/hooks";
import { OFFER_RELATIONSHIP_TYPES } from "@shared/blueprintRegistry";

vi.mock("@/lib/growth-architecture/hooks", async (orig) => {
  const real: any = await orig();
  return { ...real, useGrowthSystemsCatalog: () => ({ rows: [{ id: "sys", label: "Webinar" }] }), useAcquisitionChannels: () => ({ rows: [{ id: "ch", label: "Ads" }] }) };
});

beforeEach(() => {
  db.rows = []; db.insertError = null; insertSpy.mockClear();
  (Element.prototype as any).hasPointerCapture ??= () => false;
  (Element.prototype as any).scrollIntoView ??= () => {};
  (Element.prototype as any).releasePointerCapture ??= () => {};
});

const names: Record<string, string> = { a: "Free Guide", b: "Core Coaching", c: "VIP", d: "Club" };
const nameOf = (id: string) => names[id];
const R = (id: string, s: string, t: string, type: any) => ({ id, sub_account_id: "ws", source_offer_id: s, target_offer_id: t, relationship_type: type, notes: null });

describe("card relationship summaries", () => {
  it("groups by direction/type with registry labels and +N", () => {
    const rows = [R("1", "a", "b", "leads_into"), R("2", "a", "c", "leads_into"), R("3", "d", "a", "retention")];
    const out = summarizeOfferRelationships("a", rows, nameOf);
    expect(out.map((l) => l.text)).toEqual([
      `${OFFER_RELATIONSHIP_TYPES.retention.incoming}: Club`,
      `${OFFER_RELATIONSHIP_TYPES.leads_into.outgoing}: Core Coaching, +1`,
    ]);
  });
  it("card shows no relationship block without relationships, compact otherwise", () => {
    const offer: any = { id: "a", name: "Free Guide", tier: "free", source: "manual", data: {} };
    const { container, rerender } = render(<OfferSummaryCard offer={offer} cur="€" onEdit={() => {}} onDelete={() => {}} />);
    expect(container.querySelector("[data-card-relationships]")).toBeNull();
    rerender(<OfferSummaryCard offer={offer} cur="€" onEdit={() => {}} onDelete={() => {}}
      relationships={[{ key: "1", text: "x" }, { key: "2", text: "y" }, { key: "3", text: "z" }]} />);
    expect(screen.getByText("+1 more")).toBeTruthy();
    expect(screen.queryByText("z")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("Customer Journey overview", () => {
  const offers = Object.entries(names).map(([id, name]) => ({ id, name, tier: "core" as const }));
  it("empty state", () => {
    const { container } = render(<CustomerJourneyOverview offers={offers} rows={[]} defaultOpen />);
    expect(container.querySelector("[data-journey-empty]")).toBeTruthy();
  });
  it("renders directional edges grouped by type and marks loops", () => {
    const rows = [R("1", "a", "b", "ascends_to"), R("2", "b", "a", "downsell"), R("3", "b", "c", "ascends_to")];
    expect([...edgesInCycles(rows)].sort()).toEqual(["1", "2"]);
    const { container } = render(<CustomerJourneyOverview offers={offers} rows={rows} defaultOpen />);
    expect(container.querySelectorAll('[data-journey-group="ascends_to"] [data-journey-edge]')).toHaveLength(2);
    expect(screen.getAllByText("Loop")).toHaveLength(2);
  });
  it("load failure is graceful", () => {
    render(<CustomerJourneyOverview offers={offers} rows={[]} loadFailed defaultOpen />);
    expect(screen.getByText(/Couldn't load/)).toBeTruthy();
  });
});

describe("AddRouteDialog inline relationship", () => {
  const offers: any[] = [
    { id: "a", name: "Free Guide", tier: "free", sub_account_id: "ws" },
    { id: "b", name: "Core Coaching", tier: "core", sub_account_id: "ws" },
    { id: "x", name: "Foreign", tier: "core", sub_account_id: "other" },
  ];
  const pick = async (name: string, opt: RegExp) => {
    fireEvent.click(screen.getAllByRole("combobox").find((c) => c.getAttribute("aria-label") === name || c.textContent?.match(name))!);
    fireEvent.click(await screen.findByRole("option", { name: opt }));
  };
  const setup = (rels: any[], over: any = {}) => {
    const onCreate = vi.fn(async () => "route-1");
    const onCreateRelationship = vi.fn(async () => "rel-1");
    const utils = render(<AddRouteDialog open onOpenChange={() => {}} offers={offers} relationships={rels} workspaceId="ws"
      onCreate={over.onCreate ?? onCreate} onCreateRelationship={over.onCreateRelationship ?? onCreateRelationship} />);
    return { onCreate, onCreateRelationship, ...utils };
  };
  const fill = async () => {
    const boxes = screen.getAllByRole("combobox");
    fireEvent.click(boxes[0]); fireEvent.click(await screen.findByRole("option", { name: "Webinar" }));
    fireEvent.click(screen.getAllByRole("combobox")[1]); fireEvent.click(await screen.findByRole("option", { name: "From: Free Guide" }));
    await pick("Target offer", /Core Coaching/);
    const ch = screen.getAllByRole("combobox").find((c) => /primary channel/i.test(c.textContent ?? ""))!;
    fireEvent.click(ch); fireEvent.click(await screen.findByRole("option", { name: "Ads" }));
  };

  it("reuses an existing relationship", async () => {
    const { container, onCreateRelationship, onCreate } = setup([R("r", "a", "b", "leads_into")]);
    await fill();
    expect(container.ownerDocument.querySelector('[data-route-relationship="existing"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add Route" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ source_offer_id: "a", target_offer_id: "b" })));
    expect(onCreateRelationship).not.toHaveBeenCalled();
  });

  it("requires an explicit click to create a missing relationship, in source → target direction", async () => {
    const { onCreateRelationship } = setup([]);
    expect(screen.queryByText(/Next offer/)).toBeNull();
    await fill();
    expect((screen.getByRole("button", { name: "Add Route" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onCreateRelationship).not.toHaveBeenCalled();
    await pick("Relationship type", new RegExp(OFFER_RELATIONSHIP_TYPES.leads_into.label));
    fireEvent.click(screen.getByRole("button", { name: /Create relationship/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create relationship/ }));
    await waitFor(() => expect(onCreateRelationship).toHaveBeenCalledTimes(1));
    expect(onCreateRelationship).toHaveBeenCalledWith({ source_offer_id: "a", target_offer_id: "b", relationship_type: "leads_into" });
  });

  it("excludes offers from other workspaces", async () => {
    setup([]);
    fireEvent.click(screen.getAllByRole("combobox")[1]);
    expect(screen.queryByRole("option", { name: /Foreign/ })).toBeNull();
  });

  it("route failure keeps the dialog and creates no extra records", async () => {
    const onCreate = vi.fn(async () => null);
    const onOpenChange = vi.fn();
    const { onCreateRelationship } = setup([R("r", "a", "b", "leads_into")], { onCreate });
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Add Route" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreateRelationship).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add Route" })).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("relationship hook", () => {
  it("refreshes other instances after a change (cross-module) and blocks duplicates", async () => {
    const a = renderHook(() => useOfferRelationships("ws"));
    const b = renderHook(() => useOfferRelationships("ws"));
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    db.rows = [R("n", "a", "b", "ascends_to")];
    await act(async () => { await a.result.current.add({ source_offer_id: "a", target_offer_id: "b", relationship_type: "ascends_to" }); });
    await waitFor(() => expect(b.result.current.rows).toHaveLength(1));
    const before = insertSpy.mock.calls.length;
    await act(async () => { await a.result.current.add({ source_offer_id: "a", target_offer_id: "b", relationship_type: "ascends_to" }); });
    expect(insertSpy.mock.calls.length).toBe(before);
    expect(a.result.current.lastError).toBe("duplicate");
  });
  it("reports creation failure", async () => {
    db.insertError = { message: "Offers must belong to this workspace" };
    const a = renderHook(() => useOfferRelationships("ws"));
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    let id: any;
    await act(async () => { id = await a.result.current.add({ source_offer_id: "a", target_offer_id: "c", relationship_type: "retention" }); });
    expect(id).toBeNull();
    expect(a.result.current.lastError).toBe("cross_workspace");
  });
});
