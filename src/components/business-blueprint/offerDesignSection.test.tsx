// Offer Design opens directly on the Offer Ecosystem (no top-level tabs).
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./offer/OfferEcosystemTab", () => ({
  default: (p: any) => <div data-testid="ecosystem" data-pending={p.pendingOpenOfferId ?? ""} />,
}));

import OfferDesignSection from "./OfferDesignSection";
import { emptyOfferDesign, calculateOfferDesignProgress } from "./offerDesignTypes";

describe("Offer Design navigation", () => {
  it("renders the ecosystem directly without the old four tabs", () => {
    render(<OfferDesignSection blueprintId="bp" data={emptyOfferDesign()} onChange={() => {}} saving={false} pendingOpenOfferId="o1" />);
    expect(screen.getByTestId("ecosystem").getAttribute("data-pending")).toBe("o1");
    for (const t of ["Offer Angle", "Offer Stack", "Pricing", "Offer Ecosystem"]) expect(screen.queryByRole("button", { name: new RegExp(t) })).toBeNull();
  });
  it("progress calculation is still available and unchanged in shape", () => {
    expect(typeof calculateOfferDesignProgress(emptyOfferDesign(), {} as any)).toBe("number");
  });
});
