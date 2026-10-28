import { generateHTML, generateJSON } from "@tiptap/core";
import TurndownService from "turndown";
import { documentationStarterKit } from "./richText";
import { markdownToEditorHtml } from "./markdown";
import { safeHref, type DocNode } from "./docContent";

const markdown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
markdown.keep("u");

export const promptDocument = (source: string, content?: DocNode | null): DocNode => {
  const extensions = [documentationStarterKit()];
  try {
    const html = content?.type === "doc" ? generateHTML(content, extensions) : markdownToEditorHtml(source, false);
    const doc = generateJSON(html, extensions) as DocNode;
    const clean = (node: DocNode) => {
      node.marks = node.marks?.filter((mark) => mark.type !== "link" || safeHref(mark.attrs?.href) !== null);
      node.content?.forEach(clean);
    };
    clean(doc);
    return doc;
  } catch {
    return { type: "doc", content: [{ type: "paragraph", content: source ? [{ type: "text", text: source }] : [] }] };
  }
};

export const promptClipboardContent = (source: string, content?: DocNode | null) => {
  const html = generateHTML(promptDocument(source, content), [documentationStarterKit()]);
  return { html, markdown: content ? markdown.turndown(html) : source };
};

export const promptMarkdownSource = (doc: DocNode) => promptClipboardContent("", doc).markdown;

export const copyPromptContent = async (source: string, content?: DocNode | null): Promise<boolean> => {
  const payload = promptClipboardContent(source, content);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([payload.html], { type: "text/html" }),
        "text/plain": new Blob([payload.markdown], { type: "text/plain" }),
      })]);
      return true;
    }
  } catch { /* Browser rejected rich clipboard access; try Markdown. */ }
  try { await navigator.clipboard.writeText(payload.markdown); return true; }
  catch {
    const input = document.createElement("textarea");
    input.value = payload.markdown;
    input.setAttribute("readonly", "");
    input.className = "fixed opacity-0";
    document.body.appendChild(input);
    input.select();
    try { return document.execCommand("copy"); }
    catch { return false; }
    finally { input.remove(); }
  }
};