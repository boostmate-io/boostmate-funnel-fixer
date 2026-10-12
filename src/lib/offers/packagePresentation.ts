// Presentation-only grouping of Builder package writes (Stage D/E). Never changes
// paths, values or include flags — it only decides where a write is shown.
import type { PackageWrite } from "@shared/offerIntelligence/builderStages";
import { VALUE_CRITERIA, DIMENSION_LABELS, VALUE_DIMENSIONS, type ValueDimension } from "@shared/offerIntelligence/valueEquation";

export type PackageSectionId = "overview" | "method" | "delivery" | "value" | "pricing";

export const PACKAGE_SECTIONS: { id: PackageSectionId; title: string; hint: string }[] = [
  { id: "overview", title: "Offer overview", hint: "Name, description, audience, promise and transformation." },
  { id: "method", title: "Unique method", hint: "Your named framework and its phases or steps." },
  { id: "delivery", title: "Program structure & delivery", hint: "What buyers get, how it's delivered and the milestones along the way." },
  { id: "value", title: "Value & risk reduction", hint: "Why this is faster, easier and more certain — plus bonuses." },
  { id: "pricing", title: "Pricing & commercial terms", hint: "Proposed price and any guarantee. Both are proposals to review." },
];

export interface ScalarEntry { kind: "field"; write: PackageWrite }
export interface ListItemEntry {
  kind: "item"; key: string; listPath: string; listLabel: string; index: number;
  fields: { sub: string; label: string; write: PackageWrite }[];
}
export type PackageEntry = ScalarEntry | ListItemEntry;

const LIST_RE = /^(.*)\.(new_\d+|[0-9a-f][0-9a-f-]{7,})\.([^.]+)$/i;

export function humanize(key: string): string {
  const s = key.replace(/[_.]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : key;
}

/** Turns stored enum codes like `12_weeks` into readable text; leaves prose untouched. */
export function displayValue(v: string): string {
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(v.trim()) ? humanize(v.trim()) : v;
}

export function sectionFor(path: string): PackageSectionId {
  const p = path.toLowerCase();
  if (/(pricing|price|guarantee|payment|refund)/.test(p)) return "pricing";
  if (/(framework|mechanism|method|pillar)/.test(p)) return "method";
  if (/(bonus|angle_faster|angle_easier|angle_better|angle_new_vehicle|likelihood|risk)/.test(p)) return "value";
  if (/(deliverable|resource|support|milestone|timeline|module|session|format|duration|delivery|access|community)/.test(p)) return "delivery";
  return "overview";
}

const SUB_LABELS: Record<string, string> = { name: "Name", description: "Description", frequency: "Frequency", resource_type: "Type", phase_name: "Phase", expected_outcome: "Expected outcome" };

/** Groups writes into sections; list rows (`list.new_0.name`) become one item card. */
export function groupPackage(writes: PackageWrite[]): Record<PackageSectionId, PackageEntry[]> {
  const out: Record<PackageSectionId, PackageEntry[]> = { overview: [], method: [], delivery: [], value: [], pricing: [] };
  const items = new Map<string, ListItemEntry>();
  const counters = new Map<string, number>();
  for (const w of writes) {
    const m = LIST_RE.exec(w.path);
    const sec = sectionFor(m ? m[1] : w.path);
    if (!m) { out[sec].push({ kind: "field", write: w }); continue; }
    const [, listPath, itemKey, sub] = m;
    const key = `${listPath}.${itemKey}`;
    let item = items.get(key);
    if (!item) {
      const index = (counters.get(listPath) ?? 0) + 1;
      counters.set(listPath, index);
      const listLabel = (w.label.split(" · ")[0] ?? "").replace(/\s*#\d+$/, "").trim() || humanize(listPath.split(".").pop() ?? "Item");
      item = { kind: "item", key, listPath, listLabel, index, fields: [] };
      items.set(key, item);
      out[sec].push(item);
    }
    item.fields.push({ sub, label: SUB_LABELS[sub] ?? humanize(sub), write: w });
  }
  return out;
}

export const entryWrites = (e: PackageEntry) => (e.kind === "field" ? [e.write] : e.fields.map((f) => f.write));
export const isEmpty = (e: PackageEntry, values?: Record<string, string>) =>
  entryWrites(e).every((w) => !(values?.[w.id] ?? w.value).trim());

/** Finds a scalar write whose path ends with one of the given suffixes. */
export function findWrite(writes: PackageWrite[], suffixes: string[]): PackageWrite | undefined {
  for (const s of suffixes) { const w = writes.find((x) => x.path === s || x.path.endsWith(`.${s}`)); if (w) return w; }
  return undefined;
}

/** Item fields as a map by sub-key for presentation (name/description/…). */
export const itemMap = (item: ListItemEntry) => Object.fromEntries(item.fields.map((f) => [f.sub, f.write.value]));

// ---- Human-readable Value Equation text ----------------------------------------

export const CRITERION_LABELS: Record<string, string> = Object.fromEntries(VALUE_CRITERIA.map((c) => [c.id, c.label]));
const CODE_RE = new RegExp(`\\b(${VALUE_CRITERIA.map((c) => c.id).join("|")})\\b`, "g");
/** Replaces known internal criterion IDs in AI prose with their labels (display only). */
export const humanizeCriteria = (text: string) => (text ?? "").replace(CODE_RE, (id) => `“${CRITERION_LABELS[id]}”`);

/** Splits "Dream Outcome: … Perceived Likelihood: …" prose per dimension; null when not structured that way. */
export function splitScoreChanges(text: string): Partial<Record<ValueDimension, string>> | null {
  if (!text) return null;
  const hits = VALUE_DIMENSIONS.map((d) => ({ d, i: text.search(new RegExp(`${DIMENSION_LABELS[d]}\\s*:`, "i")) })).filter((h) => h.i >= 0).sort((a, b) => a.i - b.i);
  if (hits.length < 2) return null;
  const out: Partial<Record<ValueDimension, string>> = {};
  hits.forEach((h, k) => {
    const seg = text.slice(h.i, hits[k + 1]?.i ?? text.length);
    out[h.d] = humanizeCriteria(seg.replace(/^[^:]*:\s*/, "").trim());
  });
  return out;
}
