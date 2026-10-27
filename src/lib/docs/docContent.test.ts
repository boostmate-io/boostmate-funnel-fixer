import { describe, it, expect } from "vitest";
import { extractHeadings, safeHref, slugify } from "./docContent";
import { markdownToEditorHtml } from "./markdown";

describe("documentation content helpers", () => {
  it("builds a nested table of contents with unique ids, skipping prompt blocks", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Introduction" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What You'll Do" }] },
        { type: "aiPrompt", attrs: { title: "x", prompt: "y" } },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What You'll Do" }] },
      ],
    };
    expect(extractHeadings(doc)).toEqual([
      { id: "introduction", text: "Introduction", level: 1 },
      { id: "what-you-ll-do", text: "What You'll Do", level: 2 },
      { id: "what-you-ll-do-2", text: "What You'll Do", level: 2 },
    ]);
  });

  it("rejects script links", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("https://boostmate.io")).toBe("https://boostmate.io");
  });

  it("slugifies titles", () => {
    expect(slugify("Positioning & Messaging")).toBe("positioning-messaging");
  });

  it("turns fenced code into AI prompt blocks titled by the previous heading, keeping line breaks", () => {
    const html = markdownToEditorHtml("## Define the Transformation\n\n```\nLine one\n\nLine \"two\"\n```\n");
    expect(html).toContain('data-title="Define the Transformation"');
    expect(html).toContain('data-prompt="Line one\n\nLine &quot;two&quot;"');
  });

  it("keeps code as code when prompt conversion is off", () => {
    expect(markdownToEditorHtml("```\nhi\n```", false)).toContain("<pre>");
  });
});
