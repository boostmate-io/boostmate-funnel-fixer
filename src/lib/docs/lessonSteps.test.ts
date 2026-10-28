import { afterEach, describe, expect, it } from "vitest";
import { completionPercent, normalizeProgress, progressKey, readProgress, requestedStep, splitLessonSteps, toggleCompleted } from "./lessonSteps";

const heading = (text: string, level = 1) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
describe("optional lesson steps", () => {
  afterEach(() => localStorage.clear());
  it("splits each HR-delimited section and preserves prompts unchanged", () => {
    const prompt = { type: "aiPrompt", attrs: { prompt: "**Keep this**", promptContent: { type: "doc", content: [{ type: "horizontalRule" }] } } };
    const steps = splitLessonSteps({ type: "doc", content: [heading("First"), prompt, { type: "horizontalRule" }, heading("Second")] });
    expect(steps).toHaveLength(2);
    expect(steps[0].doc.content).toEqual([heading("First"), prompt]);
    expect(steps[1].doc.content).toEqual([heading("Second")]);
  });
  it("keeps repeated heading IDs globally stable across steps and levels", () => {
    const steps = splitLessonSteps({ type: "doc", content: [heading("Same"), { type: "horizontalRule" }, heading("Same", 2), heading("Same", 3)] });
    expect(steps.map((s) => s.headingIds)).toEqual([["same"], ["same-2", "same-3"]]);
  });
  it("supports a single step without dividers and explicit empty sections", () => {
    expect(splitLessonSteps({ type: "doc", content: [heading("First")] })).toHaveLength(1);
    expect(splitLessonSteps({ type: "doc", content: [{ type: "horizontalRule" }, { type: "horizontalRule" }] })).toHaveLength(3);
  });
  it("honors one-based URL steps before resume and bounds invalid requests", () => {
    expect(requestedStep("2", 7)).toBe(2);
    expect(requestedStep("99", 7)).toBe(7);
    expect(requestedStep("0", 7)).toBe(1);
    expect(requestedStep(null, 7)).toBeNull();
    expect(requestedStep("oops", 7)).toBeNull();
  });
  it("completion is manual, reversible, and independent of last visited step", () => {
    expect(toggleCompleted([], 2)).toEqual([2]);
    expect(toggleCompleted([2], 2)).toEqual([]);
    expect(normalizeProgress({ completed: [2], lastStep: 3 }, 7)).toEqual({ completed: [2], lastStep: 3 });
    expect(completionPercent([1, 2], 7)).toBe(29);
  });
  it("persists completion and resume separately for each lesson", () => {
    localStorage.setItem(progressKey("one"), JSON.stringify({ completed: [1, 2], lastStep: 3 }));
    expect(readProgress("one", 7)).toEqual({ completed: [1, 2], lastStep: 3 });
    expect(readProgress("two", 7)).toEqual({ completed: [], lastStep: 1 });
  });
  it("recovers from corrupt storage and prunes obsolete step indexes", () => {
    localStorage.setItem(progressKey("one"), "broken");
    expect(readProgress("one", 7)).toEqual({ completed: [], lastStep: 1 });
    expect(normalizeProgress({ completed: [1, 1, 0, 8, "2"], lastStep: 99 }, 7)).toEqual({ completed: [1], lastStep: 7 });
  });
});