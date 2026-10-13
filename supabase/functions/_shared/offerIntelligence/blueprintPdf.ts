// Branded "Irresistible Offer Blueprint" PDF, rendered deterministically from a
// completed public generation (no AI call). Deno-only (pdf-lib).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import { VALUE_DIMENSIONS, DIMENSION_LABELS } from "./valueEquation.ts";
import { auditSnapshot } from "./publicFlow.ts";
import { toText, humanize, isRedundant } from "./plainLanguage.ts";
export { toText, humanize, isRedundant };
import { BOOSTMATE_LOGO_LIGHT_PNG_BASE64 } from "./boostmateLogo.ts";

const W = 595.28, H = 841.89, M = 56;
const PRIMARY = rgb(0x62 / 255, 0x46 / 255, 1), PRIMARY_DARK = rgb(0.27, 0.18, 0.78), WHITE = rgb(1, 1, 1);
const INK = rgb(0.07, 0.09, 0.15), MUTED = rgb(0.42, 0.45, 0.5), SOFT = rgb(0.96, 0.95, 1), LINE = rgb(0.9, 0.91, 0.93), GREY = rgb(0.75, 0.77, 0.82);
const GREEN_BG = rgb(0.93, 0.98, 0.95), GREEN = rgb(0.09, 0.55, 0.3), AMBER_BG = rgb(1, 0.97, 0.9), AMBER = rgb(0.7, 0.45, 0.05);

/** Standard fonts only cover WinAnsi: map common typography, drop the rest. */
export function pdfSafe(s: unknown): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-").replace(/\u2026/g, "...").replace(/[\u2022\u25CF]/g, "-")
    .replace(/\u2192/g, "->").replace(/[\u00A0\u2009\u202F]/g, " ").replace(/\r/g, "")
    .replace(/[^\x0A\x20-\x7E\xA1-\xFF]/g, "").trim();
}

class Writer {
  doc!: PDFDocument; page!: PDFPage; y = 0; reg!: PDFFont; bold!: PDFFont; pageNo = 0;
  static async create() { const w = new Writer(); w.doc = await PDFDocument.create(); w.reg = await w.doc.embedFont(StandardFonts.Helvetica); w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold); return w; }
  newPage() {
    this.page = this.doc.addPage([W, H]); this.pageNo++; this.y = H - M;
    if (this.pageNo > 1) {
      this.page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: PRIMARY });
      this.page.drawText("Boostmate", { x: M, y: H - 34, size: 9, font: this.bold, color: PRIMARY });
      this.page.drawText("Irresistible Offer Blueprint", { x: M + 52, y: H - 34, size: 9, font: this.reg, color: MUTED });
      this.page.drawText(String(this.pageNo), { x: W - M - 6, y: 30, size: 8, font: this.reg, color: MUTED });
      this.y = H - M - 14;
    }
  }
  ensure(h: number) { if (this.y - h < M) this.newPage(); }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let wd = word;
        while (font.widthOfTextAtSize(wd, size) > width) {
          let i = wd.length; while (i > 1 && font.widthOfTextAtSize(wd.slice(0, i), size) > width) i--;
          if (line) { out.push(line); line = ""; } out.push(wd.slice(0, i)); wd = wd.slice(i);
        }
        const t = line ? `${line} ${wd}` : wd;
        if (font.widthOfTextAtSize(t, size) > width) { out.push(line); line = wd; } else line = t;
      }
      out.push(line);
    }
    return out.filter((l, i, a) => l || i < a.length - 1);
  }
  text(s: unknown, o: { size?: number; bold?: boolean; color?: any; x?: number; width?: number; gap?: number } = {}) {
    const str = pdfSafe(s); if (!str) return;
    const size = o.size ?? 10.5, font = o.bold ? this.bold : this.reg, x = o.x ?? M, width = o.width ?? W - M - x, lh = size * 1.45;
    for (const l of this.wrap(str, font, size, width)) { this.ensure(lh); this.page.drawText(l, { x, y: this.y - size, size, font, color: o.color ?? INK }); this.y -= lh; }
    this.y -= o.gap ?? 4;
  }
  section(n: number, title: string, intro?: string) {
    this.ensure(140); this.y -= 8;
    this.page.drawCircle({ x: M + 13, y: this.y - 12, size: 13, color: PRIMARY });
    const ns = String(n); this.page.drawText(ns, { x: M + 13 - this.bold.widthOfTextAtSize(ns, 13) / 2, y: this.y - 16.5, size: 13, font: this.bold, color: WHITE });
    this.text(title, { size: 19, bold: true, x: M + 36, gap: 6 });
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 1, color: LINE }); this.y -= 14;
    if (intro) this.text(intro, { color: MUTED, gap: 12 });
  }
  h2(s: string, keep = 70) { this.ensure(keep); this.y -= 6; this.text(s, { size: 13, bold: true, gap: 5 }); }
  label(s: string, color = MUTED) { this.ensure(40); this.text(s.toUpperCase(), { size: 7.5, bold: true, color, gap: 2 }); }
  field(label: string, value: unknown) { const v = toText(value); if (!pdfSafe(v)) return; this.label(label); this.text(v, { gap: 10 }); }
  bullets(items: unknown[], o: { numbered?: boolean; check?: boolean; color?: any } = {}) {
    items.map((i) => pdfSafe(toText(i))).filter(Boolean).forEach((it, i) => {
      this.ensure(28);
      const c = o.color ?? PRIMARY;
      if (o.numbered) { this.page.drawCircle({ x: M + 7, y: this.y - 6.5, size: 7, color: c }); const t = String(i + 1); this.page.drawText(t, { x: M + 7 - this.bold.widthOfTextAtSize(t, 8) / 2, y: this.y - 9.3, size: 8, font: this.bold, color: WHITE }); }
      else if (o.check) { this.page.drawRectangle({ x: M + 1, y: this.y - 11, width: 10, height: 10, borderColor: c, borderWidth: 1.2 }); }
      else this.page.drawCircle({ x: M + 5, y: this.y - 6.5, size: 2.2, color: c });
      this.text(it, { x: M + 20, gap: 5 });
    });
    this.y -= 6;
  }
  /** Height a bullet list would take (for keeping blocks together). */
  measureBullets(items: unknown[]) {
    return items.map((i) => pdfSafe(toText(i))).filter(Boolean).reduce((h, it) => h + this.wrap(it, this.reg, 10.5, W - 2 * M - 20).length * 15.2 + 5, 6);
  }
  /** Tinted card with a title and wrapped body; kept together on one page. */
  card(title: string, body: string, bg = SOFT, accent = PRIMARY) {
    const tw = W - 2 * M - 28;
    const tl = this.wrap(title, this.bold, 11, tw), bl = body ? this.wrap(body, this.reg, 10, tw) : [];
    const h = 16 + tl.length * 15 + (bl.length ? 4 + bl.length * 14.5 : 0) + 10;
    this.ensure(h + 8);
    this.page.drawRectangle({ x: M, y: this.y - h, width: W - 2 * M, height: h, color: bg });
    this.page.drawRectangle({ x: M, y: this.y - h, width: 3.5, height: h, color: accent });
    let y = this.y - 14;
    for (const l of tl) { this.page.drawText(l, { x: M + 16, y: y - 9, size: 11, font: this.bold, color: INK }); y -= 15; }
    if (bl.length) y -= 4;
    for (const l of bl) { this.page.drawText(l, { x: M + 16, y: y - 9, size: 10, font: this.reg, color: INK }); y -= 14.5; }
    this.y -= h + 10;
  }
}

const kw = (t: string) => new Set(String(t).toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
const overlap = (a: string, b: string) => { const x = kw(a), y = [...kw(b)]; return y.length ? y.filter((w) => x.has(w)).length / y.length : 0; };
const score = (p: any, d: string): number | null => { const v = p?.dimensions?.[d]; return v?.status === "assessed" && typeof v.score === "number" ? v.score : null; };
const fmt = (v: number | null) => (v == null ? "Not assessed" : `${Math.round(v * 10) / 10}/10`);

export async function renderBlueprintPdf(gen: { input: any; diagnosis: any; strengthen: any; choices: any; result: any }, generatedAt = new Date()): Promise<Uint8Array> {
  const r = gen.result; const inp = gen.input ?? {}; const snap = auditSnapshot(gen); const angle = r.design?.angle ?? {};
  const before = r.beforeProfile ?? gen.diagnosis?.profile ?? null; const after = r.profile;
  const w = await Writer.create();

  // ---- Cover
  w.newPage();
  w.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PRIMARY });
  w.page.drawCircle({ x: W - 40, y: H - 60, size: 190, color: PRIMARY_DARK, opacity: 0.35 });
  w.page.drawCircle({ x: 30, y: 120, size: 120, color: rgb(1, 1, 1), opacity: 0.06 });
  try {
    const bin = atob(BOOSTMATE_LOGO_LIGHT_PNG_BASE64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const logo = await w.doc.embedPng(bytes); const lw = 150, lh = lw * logo.height / logo.width;
    w.page.drawImage(logo, { x: M, y: H - 60 - lh, width: lw, height: lh });
  } catch { w.page.drawText("Boostmate", { x: M, y: H - 72, size: 18, font: w.bold, color: WHITE }); }
  w.y = H - 230;
  w.text("IRRESISTIBLE OFFER BLUEPRINT", { size: 10, bold: true, color: rgb(0.85, 0.82, 1), gap: 10 });
  w.text("Your Irresistible Offer Blueprint", { size: 32, bold: true, color: WHITE, gap: 26, width: W - 2 * M - 40 });
  const cardTop = w.y; const nameLines = w.wrap(r.offerName, w.bold, 18, W - 2 * M - 48); const promLines = w.wrap(toText(r.promise), w.reg, 11, W - 2 * M - 48);
  const ch = 30 + nameLines.length * 24 + 8 + promLines.length * 16 + 18;
  w.page.drawRectangle({ x: M, y: cardTop - ch, width: W - 2 * M, height: ch, color: WHITE });
  let cy = cardTop - 24;
  w.page.drawText("YOUR IMPROVED OFFER", { x: M + 24, y: cy, size: 7.5, font: w.bold, color: PRIMARY }); cy -= 26;
  for (const l of nameLines) { w.page.drawText(l, { x: M + 24, y: cy, size: 18, font: w.bold, color: INK }); cy -= 24; }
  cy -= 4; for (const l of promLines) { w.page.drawText(l, { x: M + 24, y: cy, size: 11, font: w.reg, color: MUTED }); cy -= 16; }
  w.page.drawText(`Prepared ${generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { x: M, y: 70, size: 10, font: w.reg, color: rgb(0.9, 0.88, 1) });
  w.page.drawText("boostmate.io", { x: W - M - w.bold.widthOfTextAtSize("boostmate.io", 10), y: 70, size: 10, font: w.bold, color: WHITE });

  // ---- 1. Improved offer
  w.newPage(); w.section(1, "Your improved offer");
  const transformation = toText(angle.core_outcome || inp.outcome), promise = toText(r.promise);
  w.field("Offer name", r.offerName);
  w.field("Who it's for", r.audience || inp.audience);
  if (promise && transformation && isRedundant(transformation, promise)) w.field("Transformation & core promise", promise.length >= transformation.length ? promise : transformation);
  else { w.field("Desired transformation", transformation); w.field("Core promise", promise); }
  const oneLiner = toText(angle.short_description);
  if (oneLiner && !isRedundant(oneLiner, promise)) w.field("The offer in one sentence", oneLiner);
  const positioning = toText(r.positioning || angle.positioning || angle.unique_angle || r.insights?.[0]);
  if (positioning && !isRedundant(positioning, promise)) w.field("Positioning", humanize(positioning));
  const fw = angle.framework; const fwName = toText(typeof fw === "object" && fw ? fw.name ?? fw.title : fw);
  const fwDesc = typeof fw === "object" && fw ? toText(fw.description) : "";
  const methodBody = fwDesc || toText(r.methodSummary);
  w.field("Unique method", fwName && !methodBody.includes(fwName) ? `${fwName} - ${methodBody}` : methodBody || fwName);

  // ---- 2. Value Equation chart
  w.y -= 10; w.ensure(420); w.section(2, "Value Equation: Before vs. After", r.beforeProfile
    ? "Your original offer and the improved proposal, assessed with the same criteria and evidence standard."
    : "The initial assessment of your offer idea compared with the improved proposal.");
  w.ensure(330);
  // legend
  w.page.drawRectangle({ x: M, y: w.y - 9, width: 10, height: 8, color: GREY }); w.page.drawText("Before", { x: M + 14, y: w.y - 8.5, size: 9, font: w.reg, color: MUTED });
  w.page.drawRectangle({ x: M + 60, y: w.y - 9, width: 10, height: 8, color: PRIMARY }); w.page.drawText("After", { x: M + 74, y: w.y - 8.5, size: 9, font: w.reg, color: MUTED });
  w.y -= 24;
  const barX = M + 140, barW = W - M - barX - 70;
  for (const d of VALUE_DIMENSIONS) {
    const b = score(before, d), a = score(after, d); const top = w.y;
    w.page.drawText(pdfSafe(DIMENSION_LABELS[d]), { x: M, y: top - 18, size: 10.5, font: w.bold, color: INK });
    [[b, GREY, 0], [a, PRIMARY, 17]].forEach(([v, col, off]: any) => {
      const y = top - 12 - off;
      w.page.drawRectangle({ x: barX, y, width: barW, height: 12, color: SOFT });
      for (let t = 1; t < 10; t++) w.page.drawLine({ start: { x: barX + barW * t / 10, y }, end: { x: barX + barW * t / 10, y: y + 12 }, thickness: 0.5, color: WHITE });
      if (v != null) w.page.drawRectangle({ x: barX, y, width: Math.max(3, barW * v / 10), height: 12, color: col });
      else w.page.drawText("Not assessed", { x: barX + 6, y: y + 3, size: 8, font: w.reg, color: MUTED });
      w.page.drawText(v == null ? "-" : fmt(v), { x: barX + barW + 8, y: y + 2.5, size: 9.5, font: w.bold, color: v == null ? MUTED : INK });
    });
    w.y -= 52;
  }
  if (VALUE_DIMENSIONS.some((d) => score(before, d) == null || score(after, d) == null)) w.text("\"Not assessed\" means your original answers didn't contain enough information to score that dimension responsibly - it is not a score of zero.", { size: 9, color: MUTED, gap: 2 });
  w.text("These scores are strategic assessments of how compelling the offer is. They are not sales, revenue or conversion predictions.", { size: 9, color: MUTED });

  // ---- 3. What changed and why
  w.y -= 10; w.section(3, "What changed and why");
  for (const d of VALUE_DIMENSIONS) {
    const dc = (r.dimensionChanges ?? []).find((x: any) => x.dimension === d);
    const b = score(before, d), a = score(after, d);
    const delta = b != null && a != null ? Math.round((a - b) * 10) / 10 : null;
    const tag = b == null && a != null ? "Newly assessed" : b == null && a == null ? "Not assessed" : delta! > 0 ? `+${delta}` : delta! < 0 ? `${delta}` : "No change";
    w.h2(`${DIMENSION_LABELS[d]}   ${fmt(b)} -> ${fmt(a)}   (${tag})`, 120);
    if (!dc && !(b == null && a != null)) { w.text("No specific change recorded for this dimension.", { color: MUTED, gap: 8 }); continue; }
    w.field("What changed", humanize(dc?.whatChanged));
    if (b == null && a != null) {
      w.field("Why it can now be assessed", `Your original answers didn't include enough detail to judge ${DIMENSION_LABELS[d].toLowerCase()}. The improved offer spells this out, so it can now be scored for the first time at ${fmt(a)}. This is a starting point, not an increase from zero.`);
    } else w.field("Why it matters", humanize(dc?.why));
    w.field("What remains uncertain", humanize(dc?.stillUncertain));
  }

  // ---- 4. Complete blueprint
  w.y -= 10; w.section(4, "Your complete offer blueprint");
  w.h2("Offer overview");
  w.field("Delivery", r.deliveryApproach || inp.delivery);
  w.h2("How it works");
  const deliverables: any[] = (r.design?.stack?.deliverables ?? []).filter((x: any) => x?.name);
  const incl = deliverables.length ? deliverables.map((x) => (x.description ? `${toText(x.name)}: ${toText(x.description)}` : toText(x.name))) : (r.deliverables ?? []);
  if (incl.length) { w.label("What's included"); w.bullets(incl); }
  const steps: any[] = (r.methodSteps ?? []).filter((m: any) => m?.name);
  if (steps.length) { w.label("The steps your clients follow"); w.bullets(steps.map((m: any) => (m.description ? `${m.name}: ${m.description}` : m.name)), { numbered: true }); }
  w.h2("Included in your proposed offer", 120);
  const decided = snap.decisions.filter((d: any) => d.choice && d.choice !== "Keep current approach");
  const helps: any[] = r.appliedImprovements ?? [];
  // Only what is actually part of the proposed offer; work still to be done lives in the checklist.
  const included = decided.filter((d: any) => d.kind !== "future_action");
  const used = new Set<number>();
  const matchHelp = (d: any) => {
    const text = `${d.choice ?? ""} ${d.custom ?? ""} ${d.area ?? ""}`;
    let best = -1, bestScore = 0;
    helps.forEach((h: any, i: number) => { if (used.has(i)) return; const sc = overlap(`${h.area} ${h.howItHelps}`, text); if (sc > bestScore) { best = i; bestScore = sc; } });
    if (best >= 0 && bestScore >= 0.3) { used.add(best); return helps[best]; }
    return null;
  };
  for (const dec of included) {
    const h = matchHelp(dec);
    const title = dec.own ? "Your own improvement" : `${dec.choice}${dec.custom ? ` - ${dec.custom}` : ""}`;
    const body = [dec.own ? String(dec.custom ?? "").replace(/[.\s]*$/, ".") : "", humanize(h?.howItHelps ?? "")].filter((x) => x && x !== ".").join(" ");
    w.card(pdfSafe(title), body);
  }
  if (!included.length) w.text("You didn't add any immediate changes to the offer.", { color: MUTED, gap: 8 });
  const extra = (r.additionalRecommendations ?? []).map(humanize).filter(Boolean);
  if (extra.length) { w.h2("Additional recommendations", 80); w.text("Optional ideas you didn't select - they are not part of your proposed offer.", { color: MUTED, size: 9.5, gap: 6 }); w.bullets(extra); }
  w.h2("Pricing");
  const cur = inp.stage !== "idea" && inp.currentPrice ? `${inp.currentPrice} ${inp.currency ?? ""}`.trim() : "";
  if (cur) w.field("Your current price", cur);
  if (r.pricing) { w.field("Suggested price range (estimate)", `${r.pricing.low.toLocaleString("en-US")} - ${r.pricing.high.toLocaleString("en-US")}${inp.currency ? ` ${inp.currency}` : ""}`); w.text(humanize(r.pricing.reasoning), { color: MUTED, gap: 2 }); w.text("A recommendation based on your answers - not a validated market price.", { size: 9, color: MUTED, gap: 10 }); }
  else w.text("There isn't enough information yet to recommend a specific new price - here's what to consider instead.", { color: MUTED, gap: 10 });
  const pg = r.pricingGuidance;
  if (pg) for (const [t, list] of [["What influences whether this price makes sense", pg.factors], ["How to strengthen the perceived value", pg.strengthenValue], ["What to validate before changing your price", pg.validateFirst]] as const) {
    const items = (list ?? []).map(humanize).filter(Boolean); if (items.length) { w.label(t); w.bullets(items); }
  }

  // ---- 5. Action plan
  w.y -= 10; w.section(5, "Your implementation action plan", "What's already part of your improved offer, what you still need to do, and what to test before you rely on it.");
  const reflected = decided.length
    ? decided.filter((d: any) => d.kind !== "future_action").map((d: any) => d.own
      ? `Your own improvement: ${d.custom} - included in the proposal; build or confirm anything it depends on before you claim it.`
      : `${d.choice}${d.custom ? ` (${d.custom})` : ""} - now part of how the offer is described.`)
    : helps.map((h: any) => humanize(h.howItHelps).split(/(?<=\.)\s/)[0]).filter(Boolean);
  if (reflected.length) { w.h2("Reflected in your proposed offer", 90); w.bullets(reflected, { color: GREEN }); }
  const dedupe = (v: string, i: number, a: string[]) => v && a.findIndex((x) => isRedundant(x, v)) === i;
  const todo = (r.futureActions ?? []).map(humanize).filter(dedupe);
  const validate = (r.validationNeeds ?? []).map(humanize).filter(dedupe).filter((v: string) => !todo.some((t: string) => isRedundant(t, v)));
  if (validate.length) { w.h2("What still needs validation", 90); w.bullets(validate, { color: AMBER }); }
  if (todo.length) {
    w.h2("Your implementation checklist", 90);
    w.bullets(todo, { check: true });
    w.card("Before you promote this offer", "Any resources, playbooks, testimonials, case studies or guarantees described above are part of the proposed offer. Create, collect or confirm them before you present them to clients as available or proven.", AMBER_BG, AMBER);
  }
  const assumptions = (r.assumptions ?? []).map(humanize).filter(Boolean);
  const next = (r.nextSteps?.length ? r.nextSteps : r.improvements ?? []).slice(0, 3).map(humanize);
  // Balanced ending: never leave the first steps alone on a final page.
  const hA = assumptions.length ? 30 + w.measureBullets(assumptions) : 0, hN = next.length ? 30 + w.measureBullets(next) + 40 : 0;
  if (hA && hN && w.y - hA >= M && w.y - hA - hN < M) w.newPage();
  if (assumptions.length) { w.h2("Assumptions to validate", 90); w.bullets(assumptions, { color: AMBER }); }
  if (next.length) { w.h2("Your first three steps", 90); w.bullets(next, { numbered: true }); }
  w.ensure(50); w.y -= 10;
  w.page.drawLine({ start: { x: M, y: w.y }, end: { x: W - M, y: w.y }, thickness: 1, color: LINE }); w.y -= 14;
  w.text("Created with the free Boostmate Irresistible Offer Builder - boostmate.io", { size: 9, color: MUTED });
  void GREEN_BG;

  return await w.doc.save();
}
