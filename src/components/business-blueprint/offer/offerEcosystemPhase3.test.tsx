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
import SourceOfferLinks, { linkableSourceOffers } from "../growth-architecture/SourceOfferLinks";
import { useOfferRelationships, useGrowthArchitecture } from "@/lib/growth-architecture/hooks";
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

describe("SourceOfferLinks (active wizard, Traffic Sources)", () => {
  const offers = [
    { id: "a", name: "Free Guide", sub_account_id: "ws" },
    { id: "b", name: "Core Coaching", sub_account_id: "ws" },
    { id: "c", name: "Mini Course", sub_account_id: "ws" },
    { id: "x", name: "Foreign", sub_account_id: "other" },
  ];
  const F = (id: string, offer: string | null) => ({ id, name: `Funnel ${id}`, linked_offer_id: offer });
  const view = (funnels: any[], rels: any[] = [], add: any = vi.fn(async () => "rel-1")) => {
    const utils = render(<SourceOfferLinks targetOfferId="b" workspaceId="ws" offers={offers} selectedFunnels={funnels} relationships={rels} onCreateRelationship={add} />);
    return { add, ...utils };
  };

  it("skips funnels without an offer, same-offer and other-workspace offers; dedupes by offer", () => {
    expect(linkableSourceOffers({ targetOfferId: "b", workspaceId: "ws", offers, selectedFunnels: [F("1", null), F("2", "b"), F("3", "x")] })).toEqual([]);
    const items = linkableSourceOffers({ targetOfferId: "b", workspaceId: "ws", offers, selectedFunnels: [F("1", "a"), F("2", "a"), F("3", "c")] });
    expect(items.map((i) => [i.offer.id, i.funnels.length])).toEqual([["a", 2], ["c", 1]]);
    const { container } = view([F("1", null)]);
    expect(container.querySelector("[data-source-offer-links]")).toBeNull();
  });

  it("shows existing relationship as connected, per source offer", () => {
    const { container } = view([F("1", "a"), F("3", "c")], [R("r", "a", "b", "leads_into")]);
    expect(container.querySelector('[data-source-offer="a"] [data-link-status="connected"]')?.textContent).toContain(OFFER_RELATIONSHIP_TYPES.leads_into.outgoing);
    expect(container.querySelector('[data-source-offer="c"]')?.textContent).toContain("Link these offers");
  });

  it("creates only after explicit action, source offer → target offer, once", async () => {
    const { add } = view([F("1", "a"), F("2", "a")]);
    expect(add).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Link these offers" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Link these offers" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Relationship type" }));
    fireEvent.click(await screen.findByRole("option", { name: new RegExp(OFFER_RELATIONSHIP_TYPES.retention.label.replace("/", "\\/")) }));
    const btn = screen.getByRole("button", { name: /Create link/ });
    fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add).toHaveBeenCalledWith({ source_offer_id: "a", target_offer_id: "b", relationship_type: "retention" });
  });

  it("failure doesn't throw or block (wizard continues)", async () => {
    const add = vi.fn(async () => { throw new Error("boom"); });
    view([F("1", "a")], [], add);
    fireEvent.click(screen.getByRole("button", { name: "Link these offers" }));
    fireEvent.click(screen.getByRole("button", { name: /Create link/ }));
    await waitFor(() => expect(add).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Create link/ })).toBeTruthy();
  });
});

describe("routes and relationships stay separate", () => {
  it("deleting a route only touches growth_architecture_systems", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const spy = vi.spyOn(supabase as any, "from");
    const h = renderHook(() => useGrowthArchitecture("ws"));
    await waitFor(() => expect(h.result.current.loading).toBe(false));
    spy.mockClear();
    await act(async () => { await h.result.current.remove("route-1"); });
    expect(spy.mock.calls.map((c) => c[0])).toEqual(["growth_architecture_systems"]);
  });
  it("legacy offer-to-offer route form is removed", () => {
    const files = Object.keys(import.meta.glob("../growth-architecture/*.tsx"));
    expect(files.some((f) => f.includes("AddRouteDialog"))).toBe(false);
    expect(files.some((f) => f.includes("AddRouteWizard"))).toBe(true);
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
