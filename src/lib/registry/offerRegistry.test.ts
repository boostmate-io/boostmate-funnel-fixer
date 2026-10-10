// Offer Editor metadata + drift tests for the Blueprint Registry.
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  BLUEPRINT_FIELDS,
  BLUEPRINT_FIELD_BY_PATH,
  BLUEPRINT_LISTS,
  OFFER_ITEM_FIELDS,
  OFFER_TIERS,
  TIMEFRAME_VALUES,
  DELIVERY_FREQUENCY_VALUES,
  PAYMENT_PLAN_TYPE_VALUES,
  GUARANTEE_TYPE_VALUES,
  BILLING_INTERVAL_VALUES,
  fieldsForTier,
  getRegistryTab,
  offerDesignFieldsForEditor,
  offerRelativePath,
  type OfferTier,
} from "@shared/blueprintRegistry";
import { isWritablePath } from "@/lib/coach/applyBlueprintWrites";
import type {
  DeliveryFrequency,
  EcosystemTier,
  GuaranteeType,
  PaymentPlanType,
  RecurringOffer,
  TimeframeOption,
} from "@/components/business-blueprint/offerDesignTypes";
import { ECOSYSTEM_TIERS } from "@/components/business-blueprint/offerDesignTypes";

// ---- enum values must equal the TypeScript unions -------------------------
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const values = (arr: { value: string }[]) => arr.map((v) => v.value).sort();

describe("enum value sets match offerDesignTypes unions", () => {
  it("runtime sets are complete and exact", () => {
    const all = <T extends string>(xs: Record<T, true>) => Object.keys(xs).sort();
    expect(values(TIMEFRAME_VALUES)).toEqual(
      all<TimeframeOption>({ "7_days": true, "30_days": true, "60_days": true, "90_days": true, "6_months": true, "12_months": true, custom: true }),
    );
    expect(values(DELIVERY_FREQUENCY_VALUES)).toEqual(
      all<DeliveryFrequency>({ one_time: true, daily: true, weekly: true, biweekly: true, monthly: true, quarterly: true, ongoing: true }),
    );
    expect(values(PAYMENT_PLAN_TYPE_VALUES)).toEqual(
      all<PaymentPlanType>({ full_pay: true, split_2: true, split_3: true, split_6: true, monthly: true, custom: true }),
    );
    expect(values(GUARANTEE_TYPE_VALUES)).toEqual(
      all<GuaranteeType>({ none: true, refund: true, performance: true, milestone: true, custom: true }),
    );
    expect(values(BILLING_INTERVAL_VALUES)).toEqual(
      all<NonNullable<RecurringOffer["interval"]>>({ monthly: true, quarterly: true, yearly: true }),
    );
  });
  it("OfferTier equals EcosystemTier", () => {
    const same: Exact<OfferTier, EcosystemTier> = true;
    expect(same).toBe(true);
    expect([...OFFER_TIERS]).toEqual(ECOSYSTEM_TIERS.map((t) => t.id));
  });
});

// ---- editor-only definitions stay invisible to the Coach ------------------
describe("editor-only definitions", () => {
  const editorOnly = offerDesignFieldsForEditor().filter((f) => f.editorOnly);

  it("exist for recurring + premium pricing", () => {
    const paths = editorOnly.map((f) => f.path);
    expect(paths).toContain("offer_stack.pricing.recurring_enabled");
    expect(paths).toContain("offer_stack.pricing.recurring_offer.monthly_price");
    expect(paths).toContain("offer_stack.pricing.premium_enabled");
    expect(paths).toContain("offer_stack.pricing.premium_upgrade.price");
    expect(editorOnly.every((f) => !f.aiWritable && !f.countsTowardProgress)).toBe(true);
  });

  it("are not in BLUEPRINT_FIELDS / lookups and are not writable", () => {
    for (const f of editorOnly) {
      expect(BLUEPRINT_FIELD_BY_PATH[f.path]).toBeUndefined();
      expect(isWritablePath(f.path)).toBe(false);
    }
    expect(BLUEPRINT_FIELDS.some((f) => f.editorOnly)).toBe(false);
  });

  it("list editor item fields are never expanded for the Coach", () => {
    const withEditorItems = BLUEPRINT_LISTS.filter((l) => l.editorItemFields?.length);
    expect(withEditorItems.map((l) => l.basePath).sort()).toEqual([
      "offer_stack.stack.bonuses",
      "offer_stack.stack.deliverables",
    ]);
    for (const l of withEditorItems) {
      for (const item of l.editorItemFields!) {
        expect(BLUEPRINT_FIELD_BY_PATH[`${l.basePath}.0.${item.key}`]).toBeUndefined();
      }
    }
  });
});

// ---- tier configuration ----------------------------------------------------
describe("fieldsForTier", () => {
  it("core gets angle, stack, pricing + item fields", () => {
    const cfg = fieldsForTier("core");
    expect(cfg.subBlocks.map((s) => s.id)).toEqual(["angle", "stack", "pricing"]);
    expect(cfg.itemFields).toBe(OFFER_ITEM_FIELDS);
  });
  it.each(OFFER_TIERS.filter((t) => t !== "core"))("%s gets only item fields", (tier) => {
    const cfg = fieldsForTier(tier);
    expect(cfg.subBlocks).toEqual([]);
    expect(cfg.itemFields.map((f) => f.path)).toEqual([
      "name", "data.description", "data.core_outcome", "data.price", "data.delivery_types",
    ]);
  });
  it("item fields are not Blueprint paths", () => {
    for (const f of OFFER_ITEM_FIELDS) expect(BLUEPRINT_FIELD_BY_PATH[f.path]).toBeUndefined();
  });
});

// ---- offer-relative paths ---------------------------------------------------
describe("offerRelativePath", () => {
  it("maps every offer_stack field and list", () => {
    const offerTab = getRegistryTab("offer_design")!;
    const paths = [
      ...offerDesignFieldsForEditor().map((f) => f.path),
      ...offerTab.subBlocks.flatMap((s) => s.lists.map((l) => l.basePath)),
    ];
    expect(paths.length).toBeGreaterThan(20);
    for (const p of paths) {
      const rel = offerRelativePath(p);
      expect(p).toBe(`offer_stack.${rel}`);
      expect(rel.split(".")[0]).toMatch(/^(angle|stack|pricing)$/);
    }
  });
  it("leaves non-offer paths untouched", () => {
    expect(offerRelativePath("customer_clarity.avatar_who")).toBe("customer_clarity.avatar_who");
    expect(offerRelativePath("data.price")).toBe("data.price");
  });
});

// ---- drift: hand-written paths must exist in the registry ------------------
const SRC = path.resolve(__dirname, "../..");
const SCAN = [
  "components/business-blueprint/offer",
  "components/business-blueprint/OfferDesignSection.tsx",
  "lib/coach/applyBlueprintWrites.ts",
];
const readAll = (p: string): string[] => {
  const abs = path.join(SRC, p);
  // Strip comments so doc examples are not treated as live paths.
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  if (fs.statSync(abs).isFile()) return [strip(fs.readFileSync(abs, "utf8"))];
  return fs.readdirSync(abs).filter((f) => /\.tsx?$/.test(f) && !f.includes(".test.")).flatMap((f) => readAll(path.join(p, f)));
};

/** Known paths, with list indices normalised to "*". */
const knownPatterns = (() => {
  const set = new Set<string>();
  for (const f of offerDesignFieldsForEditor()) set.add(f.path);
  for (const l of BLUEPRINT_LISTS) {
    set.add(l.basePath);
    for (const i of [...l.itemFields, ...(l.editorItemFields ?? [])]) set.add(`${l.basePath}.*.${i.key}`);
  }
  return set;
})();

// Known virtual namespace handled by coach-chat, documented as pending migration.
const ALLOWED_VIRTUAL = /^offer_stack\.ecosystem\./;

describe("drift: Offer source paths exist in the registry", () => {
  it("every offer_stack.* literal is a registry path", () => {
    const literals = new Set<string>();
    for (const src of SCAN.flatMap(readAll)) {
      for (const m of src.matchAll(/["`](offer_stack\.[^"`\s]+)["`]/g)) literals.add(m[1]);
      // Regex-encoded paths in applyBlueprintWrites (NUMBER_PATH_RE)
      for (const m of src.matchAll(/offer_stack\\\.([a-z_]+(?:\\\.[a-z_]+|\\\.\\d\+)+)/g)) {
        literals.add(`offer_stack.${m[1].replace(/\\\.\\d\+/g, ".0").replace(/\\\./g, ".")}`);
      }
    }
    expect(literals.size).toBeGreaterThan(25);
    const unknown = [...literals]
      .filter((p) => !ALLOWED_VIRTUAL.test(p))
      .map((p) => p.replace(/\$\{[^}]+\}/g, "*").replace(/\.\d+(?=\.|$)/g, ".*"))
      .filter((p) => !knownPatterns.has(p));
    expect(unknown).toEqual([]);
  });

  it("applyBlueprintWrites number/boolean paths agree with registry valueType", () => {
    const byPath = new Map(offerDesignFieldsForEditor().map((f) => [f.path, f]));
    for (const p of ["offer_stack.pricing.core_price", "offer_stack.pricing.premium_upgrade.price", "offer_stack.pricing.recurring_offer.monthly_price"]) {
      expect(byPath.get(p)?.valueType).toBe("number");
    }
    for (const p of ["offer_stack.pricing.recurring_enabled", "offer_stack.pricing.premium_enabled"]) {
      expect(byPath.get(p)?.valueType).toBe("boolean");
    }
    const plans = BLUEPRINT_LISTS.find((l) => l.basePath === "offer_stack.pricing.payment_plans")!;
    expect(plans.itemFields.find((i) => i.key === "amount")?.valueType).toBe("number");
  });
});
