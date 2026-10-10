import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal in-memory fake of the offers table with the unique primary rule.
type Row = { id: string; name: string; data: any; blueprint_id: string; source: string };
let rows: Row[] = [];
let raceInsertFirst = false;
const updates: string[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const from = () => {
    let filters: Record<string, any> = {};
    let mode: "select" | "update" | "insert" = "select";
    let payload: any;
    const api: any = {
      select: () => api,
      eq: (k: string, v: any) => ((filters[k] = v), mode === "update" ? run() : api),
      limit: () => api,
      order: () => api,
      maybeSingle: async () => ({
        data: rows.find((r) => Object.entries(filters).every(([k, v]) => (r as any)[k] === v)) ?? null,
        error: null,
      }),
      single: async () => {
        if (raceInsertFirst) {
          raceInsertFirst = false;
          rows.push({ id: "winner", name: "Other", data: {}, blueprint_id: payload.blueprint_id, source: "blueprint_core" });
        }
        if (rows.some((r) => r.blueprint_id === payload.blueprint_id && r.source === "blueprint_core"))
          return { data: null, error: { code: "23505" } };
        const row = { id: `new${rows.length}`, ...payload };
        rows.push(row);
        return { data: row, error: null };
      },
      update: (p: any) => ((mode = "update"), (payload = p), api),
      insert: (p: any) => ((mode = "insert"), (payload = p), api),
    };
    const run = async () => {
      const r = rows.find((x) => x.id === filters.id)!;
      Object.assign(r, payload);
      updates.push(r.id);
      return { error: null };
    };
    return api;
  };
  return { supabase: { from } };
});

import { upsertPrimaryOffer } from "./offerRepository";

const args = { blueprintId: "bp", subAccountId: "s", userId: "u", name: "Core", data: { price: 1 } };

beforeEach(() => {
  rows = [];
  updates.length = 0;
  raceInsertFirst = false;
});

describe("upsertPrimaryOffer", () => {
  it("creates the primary row when none exists", async () => {
    const r = await upsertPrimaryOffer(args);
    expect(r.changed).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it("updates in place and keeps the original id", async () => {
    rows.push({ id: "keep", name: "Old", data: {}, blueprint_id: "bp", source: "blueprint_core" });
    await upsertPrimaryOffer(args);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "keep", name: "Core" });
  });

  it("skips the write when values are identical", async () => {
    rows.push({ id: "keep", name: "Core", data: { price: 1 }, blueprint_id: "bp", source: "blueprint_core" });
    const r = await upsertPrimaryOffer(args);
    expect(r.changed).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it("falls back to updating the winner on a concurrent insert", async () => {
    raceInsertFirst = true;
    const r = await upsertPrimaryOffer(args);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "winner", name: "Core" });
    expect(r.changed).toBe(true);
  });
});
