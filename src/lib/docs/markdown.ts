import { marked, type Token, type Tokens } from "marked";

const escAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Convert Markdown into HTML the lesson editor can import.
 * Fenced code blocks optionally become AI Prompt blocks, titled after the nearest preceding heading.
 * The editor schema drops any tag it does not know, so raw HTML/scripts never survive import.
 */
export const markdownToEditorHtml = (md: string, codeBlocksAsPrompts = true): string => {
  const tokens = marked.lexer(md);
  let lastHeading = "AI Prompt";
  const mapped: Token[] = tokens.map((t) => {
    if (t.type === "heading") lastHeading = (t as Tokens.Heading).text.replace(/[*_`]/g, "").trim() || lastHeading;
    if (t.type === "code" && codeBlocksAsPrompts) {
      const text = (t as Tokens.Code).text;
      const html = `<div data-ai-prompt="" data-title="${escAttr(lastHeading)}" data-prompt="${escAttr(text)}"></div>`;
      return { type: "html", raw: html, text: html, block: true, pre: false } as Tokens.HTML;
    }
    return t;
  });
  (mapped as unknown as { links: unknown }).links = (tokens as unknown as { links: unknown }).links;
  return marked.parser(mapped as unknown as ReturnType<typeof marked.lexer>);
};
