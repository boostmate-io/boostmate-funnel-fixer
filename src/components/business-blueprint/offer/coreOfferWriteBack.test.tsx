import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { emptyOfferDesign, type OfferDesignData } from "../offerDesignTypes";
import { applyScopedOfferWrites } from "@/lib/coach/scopedOfferWrites";
import { useOfferCoachScope, type ScopedOfferCoach } from "./OfferCoachScope";

// Probe instead of the real shell: exposes the Coach scope + a way to "type".
let scope: ScopedOfferCoach | null = null;
vi.mock("./OfferEditorShell", () => ({
  default: ({ tabs }: any) => { const s = useOfferCoachScope(); scope = s.mode === "scoped" ? s : null; return <>{tabs.map((t: any) => <div key={t.id}>{t.content}</div>)}</>; },
}));
vi.mock("./OfferAngleTab", () => ({ default: (p: any) => { (globalThis as any).__angle = p; return null; } }));
vi.mock("./OfferStackTab", () => ({ default: () => null }));
vi.mock("./PricingTab", () => ({ default: () => null }));
import CoreOfferDialog from "./CoreOfferDialog";

const NAME = "offer_stack.angle.main_offer_name";
const OUTCOME = "offer_stack.angle.core_outcome";
const w = (path: string, value: string) => ({ path, label: path, value });

const seed = (name: string): OfferDesignData => {
  const d = emptyOfferDesign();
  d.angle.main_offer_name = name;
  (d as any).hidden_extra = { nested: { keep: true } };
  d.stack.deliverables = [{ id: "d1", name: "A", extra: "x" } as any, { id: "d2", name: "B" } as any];
  return d;
};

function mount(initial: OfferDesignData, persisted: OfferDesignData, opts: { delay?: Promise<void> } = {}) {
  const onChange = vi.fn();
  const persist = vi.fn(async (writes: any[], ctx?: { baseDesign: OfferDesignData }) => {
    await opts.delay;
    const r = applyScopedOfferWrites(ctx?.baseDesign ?? persisted, writes);
    return { appliedPaths: r.applied.map((x) => x.path), rejected: r.rejected, saved: true, design: r.next };
  });
  render(<CoreOfferDialog open onOpenChange={() => {}} title="T" initial={initial} onChange={onChange} offerId="x1"
    scopedOffer={{ id: "x1", name: "X", persistWrites: persist }} />);
  const typeAngle = (patch: any) => act(() => { (globalThis as any).__angle.onChange(patch); });
  const angle = () => (globalThis as any).__angle.data;
  return { onChange, persist, typeAngle, angle };
}

describe("Additional Core Offer — Coach write-back merges into live state", () => {
  it("approving while manual edits wait to save keeps them (not the persisted snapshot)", async () => {
    const m = mount(seed("Named"), seed("Named"));
    m.typeAngle({ short_description: "pending manual edit" });
    await act(async () => { await scope!.persistWrites([w(OUTCOME, "Coach outcome")]); });
    expect(m.persist.mock.calls[0][1].baseDesign.angle.short_description).toBe("pending manual edit");
    expect(m.angle().short_description).toBe("pending manual edit");
    expect(m.angle().core_outcome).toBe("Coach outcome");
  });

  it("typing during the save is preserved; approved field re-applied and queued", async () => {
    let release!: () => void;
    const m = mount(seed("Named"), seed("Named"), { delay: new Promise<void>((r) => { release = r; }) });
    let p!: Promise<any>;
    act(() => { p = scope!.persistWrites([w(OUTCOME, "Coach outcome")]); });
    m.typeAngle({ short_description: "typed during save" });
    await act(async () => { release(); await p; });
    expect(m.angle().short_description).toBe("typed during save");
    expect(m.angle().core_outcome).toBe("Coach outcome");
    const last = m.onChange.mock.calls.at(-1)![0];
    expect(last.angle.short_description).toBe("typed during save");
    expect(last.angle.core_outcome).toBe("Coach outcome");
  });

  it("same field edited during save: the approved Coach value wins", async () => {
    let release!: () => void;
    const m = mount(seed("Named"), seed("Named"), { delay: new Promise<void>((r) => { release = r; }) });
    let p!: Promise<any>;
    act(() => { p = scope!.persistWrites([w(OUTCOME, "Coach outcome")]); });
    m.typeAngle({ core_outcome: "manual" });
    await act(async () => { release(); await p; });
    expect(m.angle().core_outcome).toBe("Coach outcome");
  });

  it("preserves unrelated, hidden and nested fields plus list ids/order/properties", async () => {
    mount(seed("Named"), seed("Named"));
    let res: any;
    await act(async () => { res = await scope!.persistWrites([w("offer_stack.stack.deliverables.1.name", "B+")]); });
    const d = res.design;
    expect(d.hidden_extra.nested.keep).toBe(true);
    expect(d.stack.deliverables.map((x: any) => x.id)).toEqual(["d1", "d2"]);
    expect(d.stack.deliverables[0].extra).toBe("x");
    expect(d.stack.deliverables[1].name).toBe("B+");
  });

  it("unnamed offer: refused, nothing saved, edits kept", async () => {
    const m = mount(seed(""), seed(""));
    m.typeAngle({ short_description: "draft" });
    let res: any;
    await act(async () => { res = await scope!.persistWrites([w(OUTCOME, "x")]); });
    expect(m.persist).not.toHaveBeenCalled();
    expect(res.rejected[0].reason).toBe("name_required");
    expect(m.angle().short_description).toBe("draft");
  });

  it("Primary Core Offer: no scoped Coach wrapper (Blueprint path unchanged)", () => {
    scope = null;
    render(<CoreOfferDialog open onOpenChange={() => {}} title="P" initial={seed("P")} onChange={() => {}} isPrimary />);
    expect(scope).toBeNull();
  });
});
