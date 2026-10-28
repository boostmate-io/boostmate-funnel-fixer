import { extractHeadings, type DocNode } from "./docContent";

export interface LessonStep { doc: DocNode; headingIds: string[]; }
export interface LessonProgress { completed: number[]; lastStep: number; }
export const progressKey = (lessonId: string) => `boostmate:lesson-progress:${lessonId}`;

/** Split only lesson dividers, never dividers nested inside a prompt. Anchors stay global. */
export const splitLessonSteps = (doc: DocNode): LessonStep[] => {
  const sections: DocNode[][] = [[]];
  for (const node of doc.content ?? []) {
    if (node.type === "horizontalRule") sections.push([]);
    else sections[sections.length - 1].push(node);
  }
  const headings = extractHeadings(doc);
  let offset = 0;
  return sections.map((content) => {
    const section = { type: "doc", content };
    const count = extractHeadings(section).length;
    const headingIds = headings.slice(offset, offset + count).map((h) => h.id);
    offset += count;
    return { doc: section, headingIds };
  });
};

export const clampStep = (step: number, count: number) => Math.max(1, Math.min(count, step));
export const requestedStep = (value: string | null, count: number): number | null =>
  value !== null && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
    ? clampStep(Number(value), count) : null;

export const normalizeProgress = (value: unknown, count: number): LessonProgress => {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    completed: Array.isArray(record.completed) ? [...new Set(record.completed.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= count))].sort((a, b) => a - b) : [],
    lastStep: typeof record.lastStep === "number" && Number.isInteger(record.lastStep) ? clampStep(record.lastStep, count) : 1,
  };
};
export const readProgress = (id: string, count: number): LessonProgress => {
  try { return normalizeProgress(JSON.parse(localStorage.getItem(progressKey(id)) ?? "null"), count); }
  catch { return normalizeProgress(null, count); }
};
export const toggleCompleted = (completed: number[], step: number) =>
  completed.includes(step) ? completed.filter((n) => n !== step) : [...completed, step].sort((a, b) => a - b);
export const completionPercent = (completed: number[], count: number) => Math.round(completed.length / count * 100);