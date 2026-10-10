import { describe, it, expect } from "vitest";
import { BLUEPRINT_REGISTRY, offerDesignFieldsForEditor } from "@shared/blueprintRegistry";
import { toFieldDef, subBlockFields } from "@/components/business-blueprint/registryUi";

const LEGACY_KEYS = ["key", "label", "helper", "placeholder", "type", "options", "suggestions", "fullWidth", "rows"];

describe("toFieldDef metadata forwarding", () => {
  it("existing registry screens get exactly the legacy shape", () => {
    for (const tab of BLUEPRINT_REGISTRY.filter((t) => t.id !== "offer_design")) {
      for (const sb of tab.subBlocks) {
        for (const def of subBlockFields(tab.id, sb.id)) {
          expect(Object.keys(def).sort()).toEqual([...LEGACY_KEYS].sort());
        }
      }
    }
  });
  it("legacy screen field defs are unchanged (snapshot)", () => {
    const all = BLUEPRINT_REGISTRY.filter((t) => t.id !== "offer_design").map((t) => ({
      tab: t.id,
      subBlocks: t.subBlocks.map((sb) => ({ id: sb.id, fields: subBlockFields(t.id, sb.id) })),
    }));
    expect(all).toMatchSnapshot();
  });
  it("forwards valueType / enumValues / control / editorOnly when set", () => {
    const byPath = new Map(offerDesignFieldsForEditor().map((f) => [f.path, f]));
    const timeframe = toFieldDef(byPath.get("offer_stack.angle.core_promise.timeframe")!);
    expect(timeframe.valueType).toBe("enum");
    expect(timeframe.control).toBe("timeframe");
    expect(timeframe.enumValues?.length).toBe(7);
    const price = toFieldDef(byPath.get("offer_stack.pricing.core_price")!);
    expect(price.valueType).toBe("number");
    expect(price.editorOnly).toBeUndefined();
    const recurring = toFieldDef(byPath.get("offer_stack.pricing.recurring_enabled")!);
    expect(recurring.editorOnly).toBe(true);
    expect(recurring.valueType).toBe("boolean");
  });
});
