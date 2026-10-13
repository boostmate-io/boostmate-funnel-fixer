// Branded "Irresistible Offer Blueprint" PDF, rendered deterministically from a
// completed public generation (no AI call). Deno-only (pdf-lib).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import { VALUE_DIMENSIONS, DIMENSION_LABELS } from "./valueEquation.ts";
import { auditSnapshot } from "./publicFlow.ts";

const W = 595.28, H = 841.89, M = 56;
const PRIMARY = rgb(0x62 / 255, 0x46 / 255, 1);
const INK = rgb(0.07, 0.09, 0.15), MUTED = rgb(0.42, 0.45, 0.5), SOFT = rgb(0.96, 0.95, 1), LINE = rgb(0.9, 0.91, 0.93), GREY = rgb(0.78, 0.8, 0.84);

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
      this.page.drawText("Boostmate  |  Irresistible Offer Blueprint", { x: M, y: H - 32, size: 8, font: this.bold, color: PRIMARY });
      this.page.drawText(String(this.pageNo), { x: W - M - 10, y: 28, size: 8, font: this.reg, color: MUTED });
      this.y = H - M - 8;
    }
  }
  ensure(h: number) { if (this.y - h < M) this.newPage(); }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let wd = word;
        while (font.widthOfTextAtSize(wd, size) > width) { // break very long tokens (URLs)
          let i = wd.length; while (i > 1 && font.widthOfTextAtSize(wd.slice(0, i), size) > width) i--;
          if (line) { out.push(line); line = ""; } out.push(wd.slice(0, i)); wd = wd.slice(i);
        }
        const t = line ? `${line} ${wd}` : wd;
        if (font.widthOfTextAtSize(t, size) > width) { out.push(line); line = wd; } else line = t;
      }
      out.push(line);
    }
    return out;
  }
  text(s: unknown, o: { size?: number; bold?: boolean; color?: any; x?: number; width?: number; gap?: number } = {}) {
    const str = pdfSafe(s); if (!str) return;
    const size = o.size ?? 10.5, font = o.bold ? this.bold : this.reg, x = o.x ?? M, width = o.width ?? W - M - x, lh = size * 1.45;
    for (const l of this.wrap(str, font, size, width)) { this.ensure(lh); this.page.drawText(l, { x, y: this.y - size, size, font, color: o.color ?? INK }); this.y -= lh; }
    this.y -= o.gap ?? 4;
  }
  h1(s: string) { this.ensure(70); this.y -= 6; this.text(s, { size: 20, bold: true, gap: 2 }); this.page.drawRectangle({ x: M, y: this.y - 2, width: 40, height: 3, color: PRIMARY }); this.y -= 18; }
  h2(s: string) { this.ensure(50); this.y -= 6; this.text(s, { size: 13, bold: true, gap: 4 }); }
  label(s: string) { this.ensure(40); this.text(s.toUpperCase(), { size: 8, bold: true, color: MUTED, gap: 1 }); }
  field(label: string, value: unknown) { if (!pdfSafe(value)) return; this.label(label); this.text(value, { gap: 10 }); }
  bullets(items: unknown[], numbered = false) {
    items.map(pdfSafe).filter(Boolean).forEach((it, i) => {
      this.ensure(16); const mark = numbered ? `${i + 1}.` : "-";
      this.page.drawText(mark, { x: M + 2, y: this.y - 10.5, size: 10.5, font: this.bold, color: PRIMARY });
      this.text(it, { x: M + 18, gap: 3 });
    });
    this.y -= 6;
  }
}

const score = (p: any, d: string): number | null => { const v = p?.dimensions?.[d]; return v?.status === "assessed" && typeof v.score === "number" ? v.score : null; };

export async function renderBlueprintPdf(gen: { input: any; diagnosis: any; strengthen: any; choices: any; result: any }, generatedAt = new Date()): Promise<Uint8Array> {
  const r = gen.result; const inp = gen.input ?? {}; const snap = auditSnapshot(gen);
  const before = r.beforeProfile ?? gen.diagnosis?.profile ?? null; const after = r.profile;
  const w = await Writer.create();

  // ---- Cover
  w.newPage();
  w.page.drawRectangle({ x: 0, y: H - 300, width: W, height: 300, color: PRIMARY });
  w.page.drawText("Boostmate", { x: M, y: H - 70, size: 16, font: w.bold, color: rgb(1, 1, 1) });
  w.y = H - 150;
  w.text("Your Irresistible Offer Blueprint", { size: 28, bold: true, color: rgb(1, 1, 1), gap: 6 });
  w.text(generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), { size: 11, color: rgb(0.92, 0.9, 1) });
  w.y = H - 350;
  w.text(r.offerName, { size: 22, bold: true, gap: 10 });
  w.text(r.promise, { size: 13, color: MUTED, gap: 24 });
  w.label("Inside this blueprint");
  w.bullets(["Your improved offer", "Value Equation: Before vs. After", "What changed and why", "Your complete offer blueprint", "Your implementation action plan"], true);

  // ---- 1. Improved offer
  w.newPage(); w.h1("1. Your improved offer");
  w.field("Offer name", r.offerName);
  w.field("Target audience", r.audience || inp.audience);
  w.field("Desired transformation", r.design?.angle?.core_outcome || inp.outcome);
  w.field("Core promise", r.promise);
  w.field("Positioning", r.design?.angle?.positioning || r.design?.angle?.unique_angle || r.insights?.[0]);
  w.field("Unique method", [r.design?.angle?.framework, r.methodSummary].filter(Boolean).join(" - "));

  // ---- 2. Value Equation chart
  w.newPage(); w.h1("2. Value Equation: Before vs. After");
  w.text(before === r.beforeProfile && r.beforeProfile ? "Your original offer and the improved proposal, assessed with the same criteria and evidence standard." : "The initial assessment of your offer idea compared with the improved proposal.", { color: MUTED, gap: 12 });
  const barW = W - 2 * M - 150;
  for (const d of VALUE_DIMENSIONS) {
    w.ensure(64); const b = score(before, d), a = score(after, d);
    w.text(DIMENSION_LABELS[d], { bold: true, size: 11, gap: 2 });
    for (const [lbl, v, col] of [["Before", b, GREY], ["After", a, PRIMARY]] as const) {
      const y = w.y - 11;
      w.page.drawText(lbl, { x: M, y: y + 2, size: 9, font: w.reg, color: MUTED });
      w.page.drawRectangle({ x: M + 50, y, width: barW, height: 10, color: SOFT });
      if (v != null) w.page.drawRectangle({ x: M + 50, y, width: Math.max(2, barW * v / 10), height: 10, color: col });
      w.page.drawText(v == null ? "Not assessed" : `${v}/10`, { x: M + 60 + barW, y: y + 1, size: 9, font: w.bold, color: v == null ? MUTED : INK });
      w.y -= 16;
    }
    w.y -= 10;
  }
  w.y -= 4;
  w.text("\"Not assessed\" means there was not enough information to score that dimension responsibly - it is not a low score.", { size: 9, color: MUTED, gap: 2 });
  w.text("These scores are strategic assessments of how compelling the offer is. They are not sales, revenue or conversion predictions.", { size: 9, color: MUTED });

  // ---- 3. What changed and why
  w.newPage(); w.h1("3. What changed and why");
  for (const d of VALUE_DIMENSIONS) {
    const dc = (r.dimensionChanges ?? []).find((x: any) => x.dimension === d);
    const b = score(before, d), a = score(after, d);
    w.h2(`${DIMENSION_LABELS[d]}  (${b ?? "-"} -> ${a ?? "-"})`);
    if (!dc) { w.text("No specific change recorded for this dimension.", { color: MUTED, gap: 8 }); continue; }
    w.field("What changed", dc.whatChanged); w.field("Why it matters", dc.why); w.field("What remains uncertain", dc.stillUncertain);
  }

  // ---- 4. Complete blueprint
  w.newPage(); w.h1("4. Your complete offer blueprint");
  w.h2("Offer overview");
  w.field("Who it's for", r.audience); w.field("Promise", r.promise); w.field("Delivery", r.deliveryApproach || inp.delivery);
  w.h2("How it works");
  w.field("Method", r.methodSummary);
  const deliverables: any[] = (r.design?.stack?.deliverables ?? []).filter((x: any) => x?.name);
  if (deliverables.length) { w.label("What's included"); w.bullets(deliverables.map((x) => x.description ? `${x.name}: ${x.description}` : x.name)); }
  else if (r.deliverables?.length) { w.label("What's included"); w.bullets(r.deliverables); }
  w.h2("What makes it stronger");
  if (snap.decisions.length) { w.label("Your decisions"); w.bullets(snap.decisions.map((d: any) => `${d.area}: ${d.choice ?? "-"}${d.custom ? ` (${d.custom})` : ""}`)); }
  if (r.appliedImprovements?.length) { w.label("How the improvements help"); w.bullets(r.appliedImprovements.map((x: any) => `${x.area}: ${x.howItHelps}`)); }
  w.h2("Pricing");
  const cur = inp.stage !== "idea" && inp.currentPrice ? `${inp.currentPrice} ${inp.currency ?? ""}`.trim() : "";
  if (cur) w.field("Your current price", cur);
  if (r.pricing) { w.field("Suggested price range (estimate)", `${r.pricing.low.toLocaleString("en-US")} - ${r.pricing.high.toLocaleString("en-US")}${inp.currency ? ` ${inp.currency}` : ""}`); w.text(r.pricing.reasoning, { color: MUTED, gap: 2 }); w.text("A recommendation based on your answers - not a validated market price.", { size: 9, color: MUTED, gap: 10 }); }
  else w.text("There isn't enough information yet for a responsible price suggestion.", { color: MUTED, gap: 10 });
  w.h2("Validation & next steps");
  const validate = r.validationNeeds?.length ? r.validationNeeds : r.assumptions ?? [];
  if (validate.length) { w.label("What still needs validation"); w.bullets(validate); }

  // ---- 5. Action plan
  w.newPage(); w.h1("5. Your implementation action plan");
  const applied = (r.appliedImprovements ?? []).map((x: any) => x.area);
  if (applied.length) { w.h2("Already built into your improved offer"); w.bullets(applied); }
  if (r.futureActions?.length) { w.h2("Still to implement"); w.bullets(r.futureActions); }
  if (r.assumptions?.length) { w.h2("Assumptions to validate"); w.bullets(r.assumptions); }
  const next = r.nextSteps?.length ? r.nextSteps : r.improvements ?? [];
  if (next.length) { w.h2("Recommended next steps"); w.bullets(next, true); }
  w.ensure(60); w.y -= 10;
  w.page.drawLine({ start: { x: M, y: w.y }, end: { x: W - M, y: w.y }, thickness: 1, color: LINE }); w.y -= 14;
  w.text("Created with the free Boostmate Irresistible Offer Builder - boostmate.io", { size: 9, color: MUTED });

  return await w.doc.save();
}
