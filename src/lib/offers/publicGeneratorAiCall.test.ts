import { describe, it, expect } from "vitest";
import { parseDeliverResponse, RECOVERABLE_AI_ERRORS } from "@shared/offerIntelligence/aiCall";
import { generatorErrorMessage } from "@/lib/offers/publicOfferGenerator";

const body = (finish: string, name: string, args: string) => ({
  choices: [{ finish_reason: finish, message: { tool_calls: [{ function: { name, arguments: args } }] } }],
});

describe("parseDeliverResponse (regression: fitness-coach generation failure)", () => {
  it("flags output cut off by the token cap as truncated, not invalid content", () => {
    const r = parseDeliverResponse(body("length", "google:python_interpreter", JSON.stringify({ code: "print(default_api.deliver(writes=[" })));
    expect(r).toEqual({ ok: false, status: 502, error: "ai_truncated" });
  });
  it("rejects calls to a tool other than deliver", () => {
    const r = parseDeliverResponse(body("tool_calls", "google:python_interpreter", JSON.stringify({ code: "x" })));
    expect(r.ok).toBe(false);
    expect((r as any).error).toBe("ai_wrong_tool");
  });
  it("rejects missing tool calls and unparsable arguments", () => {
    expect((parseDeliverResponse({ choices: [{ finish_reason: "stop", message: {} }] }) as any).error).toBe("ai_malformed");
    expect((parseDeliverResponse(body("stop", "deliver", "{bad")) as any).error).toBe("ai_malformed");
  });
  it("returns deliver arguments when complete", () => {
    const r = parseDeliverResponse(body("stop", "deliver", JSON.stringify({ audience: "a" })));
    expect(r).toEqual({ ok: true, raw: { audience: "a" } });
  });
  it("treats these technical errors as recoverable", () => {
    expect(RECOVERABLE_AI_ERRORS).toEqual(expect.arrayContaining(["ai_truncated", "ai_wrong_tool", "ai_malformed"]));
  });
  it("never tells visitors to add more detail", () => {
    for (const c of ["ai_invalid", "ai_failed", "ai_malformed"]) expect(generatorErrorMessage(c)).not.toMatch(/more detail/i);
  });
});
