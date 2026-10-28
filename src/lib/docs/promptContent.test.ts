import { describe, expect, it, vi, afterEach } from "vitest";
import { copyPromptContent, promptDocument, promptClipboardContent } from "./promptContent";

afterEach(() => vi.unstubAllGlobals());
describe("rich prompt compatibility", () => {
  it("converts legacy Markdown into formatted document nodes", () => {
    const doc = promptDocument("# Role\n\n**Bold** and *italic*\n\n- First\n- Second\n\n[Link](https://boostmate.io)");
    expect(doc.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(doc.content?.[1].content?.[0].marks).toContainEqual({ type: "bold" });
    expect(doc.content?.[2].type).toBe("bulletList");
  });
  it("copies both safe rich HTML and Markdown from a rich document", async () => {
    const content = promptDocument("# Role\n\n**Bold**\n\n- First\n- Second");
    const payload = promptClipboardContent("", content);
    expect(payload.html).toContain("<h1>Role</h1>");
    expect(payload.html).toContain("<strong>Bold</strong>");
    expect(payload.markdown).toContain("# Role");
    expect(payload.markdown).toContain("**Bold**");
    let copied: Record<string, Blob> = {};
    vi.stubGlobal("ClipboardItem", class { constructor(data: Record<string, Blob>) { copied = data; } });
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write } });
    expect(await copyPromptContent("", content)).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(copied["text/html"].type).toBe("text/html");
    expect(copied["text/plain"].type).toBe("text/plain");
  });
  it("retains legacy Markdown exactly when rich clipboard support is unavailable", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const source = "# Role\n\n**Bold**\n";
    expect(await copyPromptContent(source)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(source);
  });
  it("does not include unsafe links or scripts in rich clipboard HTML", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Safe", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] };
    expect(promptClipboardContent("", doc).html).not.toContain("javascript:");
  });
});