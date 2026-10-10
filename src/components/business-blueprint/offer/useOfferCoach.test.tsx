import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

const openCoachSpy = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/contexts/CoachContext", () => ({ useCoach: () => ({ openCoach: openCoachSpy }) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws-1" }) }));

import { useOfferCoach } from "./useOfferCoach";
import { OfferCoachScopeProvider, type ScopedOfferCoach } from "./OfferCoachScope";
import { emptyOfferDesign } from "../offerDesignTypes";

const fieldSpec = { id: "offer_stack.angle.core_outcome", label: "Core Outcome", currentValue: "", apply: vi.fn() };
const listSpec = {
  id: "pillars", label: "Pillars", basePath: "offer_stack.angle.framework.pillars",
  itemFields: [{ key: "name", label: "Name" }], appendItem: vi.fn(),
};

beforeEach(() => openCoachSpy.mockReset());

describe("useOfferCoach — primary (unchanged)", () => {
  it("field + list focus match the legacy shape (no scoped handler on fields)", () => {
    const primarySnapshot = { offer_stack: { angle: { main_offer_name: "Primary" } } };
    const { result } = renderHook(() => useOfferCoach(() => primarySnapshot));
    result.current.openCoach(fieldSpec);
    result.current.openListCoach(listSpec);
    const [field] = openCoachSpy.mock.calls[0];
    const [listFocus] = openCoachSpy.mock.calls[1];
    expect(field.key).toBe("offer-field:offer_stack.angle.core_outcome");
    expect(field.label).toBe("Core Outcome");
    expect(field.onApplyBlueprintWrites).toBeUndefined();
    expect(field.blueprintSnapshot).toBe(primarySnapshot);
    expect(listFocus.key).toBe("offer-list:pillars");
    expect(typeof listFocus.onApplyBlueprintWrites).toBe("function");
  });
});

describe("useOfferCoach — scoped additional Core Offer", () => {
  const design = emptyOfferDesign();
  design.angle.main_offer_name = "Extra";
  const scope: ScopedOfferCoach = {
    mode: "scoped", offerId: "extra-1", offerName: "Extra",
    getDesign: () => design,
    persistWrites: vi.fn(async (writes: any[]) => ({ appliedPaths: writes.map((w) => w.path), rejected: [], saved: true })),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <OfferCoachScopeProvider value={scope}>{children}</OfferCoachScopeProvider>
  );

  it("uses the scoped offer as context and always sets an explicit write handler", () => {
    const { result } = renderHook(() => useOfferCoach(() => ({ offer_stack: { angle: { main_offer_name: "WRONG" } } })), { wrapper });
    result.current.openCoach(fieldSpec);
    result.current.openListCoach(listSpec);
    for (const [focus] of openCoachSpy.mock.calls) {
      // Global Blueprint fallback in GlobalCoachBubble only runs when this is undefined.
      expect(typeof focus.onApplyBlueprintWrites).toBe("function");
      expect((focus.blueprintSnapshot as any).offer_stack.angle.main_offer_name).toBe("Extra");
      expect(focus.key).toContain("@offer:extra-1");
    }
  });

  it("field-mode Blueprint writes land on the scoped offer only", async () => {
    const { result } = renderHook(() => useOfferCoach(() => ({})), { wrapper });
    result.current.openCoach(fieldSpec);
    const [focus] = openCoachSpy.mock.calls[0];
    const writes = [{ path: "offer_stack.angle.core_outcome", label: "", value: "Result" }];
    const res = await focus.onApplyBlueprintWrites(writes);
    expect(scope.persistWrites).toHaveBeenCalledWith(writes);
    expect(res).toEqual({ appliedPaths: ["offer_stack.angle.core_outcome"] });
  });
});
