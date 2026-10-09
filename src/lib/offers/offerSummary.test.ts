import { describe, expect, it } from "vitest";
import { emptyOfferDesign } from "@/components/business-blueprint/offerDesignTypes";
import { isSummaryEmpty, summarizeOfferDesign, summaryToRowData } from "./offerSummary";
import { designToRowValues } from "./offerRepository";

const design = () => {
  const d = emptyOfferDesign();
  d.angle.main_offer_name = "  Growth Program ";
  d.angle.short_description = "Short desc";
  d.angle.core_outcome = "Outcome";
  d.pricing.core_price = 2500 as any;
  d.stack.deliverables = [
    { id: "1", name: "Calls", description: "", delivery_types: ["Group calls", "Video"], frequency: "" } as any,
  ];
  d.stack.support_channels = [{ id: "s", name: "Slack", description: "", frequency: "" } as any, { id: "t", name: "Video" } as any];
  return d;
};

describe("summarizeOfferDesign", () => {
  it("extracts trimmed name, description, outcome, price and unique delivery types", () => {
    expect(summarizeOfferDesign(design())).toEqual({
      name: "Growth Program",
      description: "Short desc",
      core_outcome: "Outcome",
      price: 2500,
      delivery_types: ["Group calls", "Video", "Slack"],
    });
  });

  it("falls back to the promise outcome when outcome is empty", () => {
    const d = design();
    d.angle.core_outcome = "";
    d.angle.core_promise = { ...(d.angle.core_promise as any), desired_outcome: "Desired" } as any;
    expect(summarizeOfferDesign(d).core_outcome).toBe("Desired");
  });

  it("treats an empty design as empty with blank price", () => {
    const s = summarizeOfferDesign(emptyOfferDesign());
    expect(s.price).toBe("");
    expect(isSummaryEmpty(s)).toBe(true);
  });

  it("preserves unrelated row data keys", () => {
    expect(summaryToRowData({ custom: 1 }, summarizeOfferDesign(design()))).toMatchObject({ custom: 1, price: 2500 });
  });

  it("keeps the existing row name when the design has none and stores the design", () => {
    const d = emptyOfferDesign();
    const v = designToRowValues(d, { name: "Existing", data: { foo: "bar" } });
    expect(v.name).toBe("Existing");
    expect(v.data).toMatchObject({ foo: "bar", design: d });
  });
});
