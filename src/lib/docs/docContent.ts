// Shared pure helpers for Documentation content (Tiptap JSON).
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const EMPTY_DOC: DocNode = { type: "doc", content: [] };

export const tocHeadingLevels = (value: unknown): number[] =>
  Array.isArray(value) ? [1, 2, 3].filter((level) => value.includes(level)) : [1];

/** Filter after assigning all anchors so omitted levels never change heading IDs.
 * When the selected levels match no heading in the lesson, fall back to the shallowest
 * level the lesson actually uses, so a lesson is never left without a contents list. */
export const lessonTableOfContents = (doc: DocNode, levels: unknown): TocItem[] => {
  const selected = tocHeadingLevels(levels);
  const headings = extractHeadings(doc);
  const filtered = headings.filter((heading) => selected.includes(heading.level));
  if (filtered.length || !selected.length) return filtered;
  const shallowest = Math.min(...headings.map((heading) => heading.level));
  return headings.filter((heading) => heading.level === shallowest);
};

export const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const nodeText = (n: DocNode): string =>
  n.text ?? (n.content ?? []).map(nodeText).join("");

/** Headings in document order with stable, unique anchor ids. */
export const extractHeadings = (doc: DocNode | null | undefined): TocItem[] => {
  const out: TocItem[] = [];
  const seen = new Map<string, number>();
  const walk = (n: DocNode) => {
    if (n.type === "heading") {
      const text = nodeText(n).trim();
      if (!text) return;
      const base = slugify(text) || "section";
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      out.push({ id: count ? `${base}-${count + 1}` : base, text, level: Number(n.attrs?.level ?? 2) });
      return;
    }
    if (n.type === "aiPrompt") return;
    (n.content ?? []).forEach(walk);
  };
  if (doc) walk(doc);
  return out;
};

/** Only allow safe link protocols in public rendering. */
export const safeHref = (href: unknown): string | null => {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^(https?:|mailto:)/i.test(h) || h.startsWith("#") || h.startsWith("/")) return h;
  return null;
};

export const docCourseUrl = (courseSlug: string) => `${window.location.origin}/docs/${courseSlug}`;
export const docLessonUrl = (courseSlug: string, lessonSlug: string) =>
  `${window.location.origin}/docs/${courseSlug}/${lessonSlug}`;
