export type PromptFormat = "h1" | "h2" | "h3" | "bold" | "italic" | "bullet" | "ordered" | "link" | "quote" | "code" | "codeBlock" | "divider";

/** Insert syntax into the source directly; never round-trip through rendered HTML. */
export const formatPromptSelection = (source: string, start: number, end: number, format: PromptFormat) => {
  const selected = source.slice(start, end);
  const wrappers: Partial<Record<PromptFormat, [string, string, string]>> = {
    bold: ["**", "**", "bold text"], italic: ["*", "*", "italic text"],
    link: ["[", "](https://)", "link text"], code: ["`", "`", "code"],
  };
  const wrapper = wrappers[format];
  if (wrapper) {
    const [before, after, placeholder] = wrapper;
    const text = selected || placeholder;
    return { source: source.slice(0, start) + before + text + after + source.slice(end), start: start + before.length, end: start + before.length + text.length };
  }
  const from = source.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = source.indexOf("\n", end);
  const to = nextBreak < 0 ? source.length : nextBreak;
  const lines = source.slice(from, to) || "text";
  const prefix = format === "h1" ? "# " : format === "h2" ? "## " : format === "h3" ? "### " : format === "quote" ? "> " : "- ";
  const replacement = format === "codeBlock" ? "```\n" + lines + "\n```"
    : format === "divider" ? lines + "\n\n---\n"
    : lines.split("\n").map((line, i) => (format === "ordered" ? `${i + 1}. ` : prefix) + line).join("\n");
  return { source: source.slice(0, from) + replacement + source.slice(to), start: from, end: from + replacement.length };
};