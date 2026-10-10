import { describe, expect, it } from "vitest";
import {
  BUSINESS_LAYER_HEADING,
  filterHistoryForOffer,
  isOfferUndefined,
  renderActiveOfferSection,
  renderHistoryIsolationNote,
  renderOfferSwitchNote,
  replayPrefix,
  shouldIsolateOfferHistory,
} from "@shared/offerContext";

const NEW = "d710189e-96fa-492c-9fbd-1a96e9bc0cc5";
const MOMENTUM = "4e8ab314-8aa2-41b8-b1e3-360e8c42bd0a";
const tag = (offerId: string, offerName = "x") => ({ type: "offer_context", offerId, offerName, tier: "core", isPrimary: false });
const msg = (role: string, content: string, offerId?: string) => ({
  role,
  content,
  parts: [{ type: "text", text: content }, ...(offerId ? [tag(offerId, offerId === NEW ? "nieuw core offer" : "The Momentum Method")] : [])],
});

// Mirrors the live conversation that leaked "The Momentum Method".
const history = [
  msg("user", "Let's work on Main Offer Name — het"),
  msg("assistant", "We previously landed on The Momentum Method for tech marketing managers"),
  msg("user", "Framework pillars", MOMENTUM),
  msg("assistant", "Momentum pillars: Focus, Flow, Output", MOMENTUM),
  msg("user", "Let's work on Better Results — nieuw core offer", NEW),
  msg("assistant", "What makes this offer different?", NEW),
  msg("user", "Help me with Better Results", NEW),
];

describe("model-only history isolation", () => {
  const { kept, excluded } = filterHistoryForOffer(history, NEW);
  const text = kept.map((m) => m.content).join("\n");

  it("excludes legacy unlabelled history", () => {
    expect(text).not.toContain("We previously landed on The Momentum Method");
  });
  it("excludes messages from another offer", () => {
    expect(text).not.toContain("Momentum pillars");
  });
  it("includes messages belonging to the active offer and the current turn", () => {
    expect(kept).toHaveLength(3);
    expect(kept[kept.length - 1].content).toBe("Help me with Better Results");
    expect(excluded).toBe(4);
  });
  it("summaries are built from the filtered list, so excluded details can't return", () => {
    // windowMessagesForModel only ever receives `kept` when isolating.
    expect(JSON.stringify(kept)).not.toMatch(/Momentum/);
  });
  it("tells the model that history was isolated", () => {
    expect(renderHistoryIsolationNote(excluded, { id: NEW, name: "nieuw core offer" })).toMatch(/4 earlier message\(s\)/);
    expect(renderHistoryIsolationNote(0, { id: NEW, name: "n" })).toBeNull();
  });
  it("visible chat history is not mutated", () => {
    expect(history).toHaveLength(7);
  });
});

describe("when to isolate", () => {
  const base = { hasVerifiedAdditionalOffer: true, latestUserText: "Help me with Better Results" };
  it("isolates field and section assistance on an additional offer", () => {
    expect(shouldIsolateOfferHistory({ ...base, scope: "blueprint.field" })).toBe(true);
    expect(shouldIsolateOfferHistory({ ...base, scope: "blueprint.section" })).toBe(true);
  });
  it("global coaching keeps cross-offer context", () => {
    expect(shouldIsolateOfferHistory({ ...base, scope: "global" })).toBe(false);
    expect(shouldIsolateOfferHistory({ ...base, scope: "blueprint.field", latestUserText: "Which lead magnet should connect to my Core Offer?" })).toBe(false);
    expect(shouldIsolateOfferHistory({ ...base, scope: "blueprint.field", latestUserText: "welke andere offers bestaan er nog?" })).toBe(false);
    expect(shouldIsolateOfferHistory({ ...base, scope: "blueprint.field", latestUserText: "How should I structure my entire offer ecosystem?" })).toBe(false);
  });
  it("Primary / no active offer keeps today's history", () => {
    expect(shouldIsolateOfferHistory({ ...base, hasVerifiedAdditionalOffer: false, scope: "blueprint.field" })).toBe(false);
  });
  it("non-isolated replay marks unattributed messages", () => {
    expect(replayPrefix(history[1], true)).toMatch(/Unattributed/);
    expect(replayPrefix(history[1], false)).toBe("");
    expect(replayPrefix(history[3], true)).toContain("The Momentum Method");
  });
});

describe("switching offers", () => {
  const active = tag(NEW, "nieuw core offer") as never;
  it("unlabelled earlier history triggers the switch note", () => {
    expect(renderOfferSwitchNote([history[0], history[1], msg("user", "now", NEW)], active)).toMatch(/unattributed/);
  });
  it("switching from another tagged offer triggers the note", () => {
    expect(renderOfferSwitchNote([history[2], history[3], msg("user", "now", NEW)], active)).toContain("The Momentum Method");
  });
  it("staying on the same offer adds no note, even when the current turn is tagged", () => {
    expect(renderOfferSwitchNote(history, active)).toBeNull();
  });
});

describe("undefined-offer detection", () => {
  it("name and isolated differentiation fields do not define an offer", () => {
    expect(isOfferUndefined({ angle: { main_offer_name: "nieuw core offer", angle_better_results: "netter rerter", framework: { pillars: [] } } })).toBe(true);
  });
  it("any defining field marks it as defined", () => {
    expect(isOfferUndefined({ angle: { core_outcome: "More clients" } })).toBe(false);
    expect(isOfferUndefined({ angle: { framework: { name: "X" } } })).toBe(false);
    expect(isOfferUndefined({ angle: { core_promise: { desired_outcome: "y" } } })).toBe(false);
  });
  it("undefined offers get discovery-first guidance", () => {
    const s = renderActiveOfferSection({ id: NEW, name: "nieuw core offer", tier: "core", isPrimary: false, hasDraft: false, design: { angle: { main_offer_name: "n", angle_better_results: "netter rerter" } } });
    expect(s).toMatch(/UNDEFINED OFFER — discovery first/);
    expect(s).toMatch(/discovery questions/);
  });
  it("business-level audience facts are labelled as unconfirmed for the offer", () => {
    expect(BUSINESS_LAYER_HEADING).toMatch(/not facts about the active offer/);
    expect(BUSINESS_LAYER_HEADING).toMatch(/UNCONFIRMED/);
  });
});
