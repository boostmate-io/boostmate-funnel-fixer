import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { useLessonSteps } from "./useLessonSteps";
import { progressKey } from "@/lib/docs/lessonSteps";

const lesson = { id: "steps", step_by_step: true, content: { type: "doc", content: [{ type: "paragraph" }, { type: "horizontalRule" }, { type: "paragraph" }] } };
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
const at = (path: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;

describe("lesson step state", () => {
  afterEach(() => localStorage.clear());
  it("can render before a lesson loads", () => {
    const { result } = renderHook(() => useLessonSteps(null), { wrapper });
    expect(result.current.currentStep).toBe(1);
    expect(result.current.completed).toEqual([]);
  });
  it("resumes locally, writes a history-safe URL, and never completes on navigation", async () => {
    localStorage.setItem(progressKey(lesson.id), JSON.stringify({ completed: [], lastStep: 2 }));
    const { result } = renderHook(() => ({ steps: useLessonSteps(lesson), location: useLocation() }), { wrapper });
    await waitFor(() => expect(result.current.location.search).toBe("?step=2"));
    act(() => result.current.steps.goToStep(1));
    await waitFor(() => expect(result.current.steps.currentStep).toBe(1));
    expect(result.current.steps.completed).toEqual([]);
    act(() => result.current.steps.toggle());
    await waitFor(() => expect(result.current.steps.completed).toEqual([1]));
  });
  it("explicit URL wins over last visited step", () => {
    localStorage.setItem(progressKey(lesson.id), JSON.stringify({ completed: [2], lastStep: 2 }));
    const { result } = renderHook(() => useLessonSteps(lesson), { wrapper: at("/lesson?step=1") });
    expect(result.current.currentStep).toBe(1);
    expect(result.current.completed).toEqual([2]);
  });
  it("writes the step of the lesson the URL points at", async () => {
    const target = { ...lesson, id: "next", slug: "customer-clarity" };
    const { result } = renderHook(() => ({ steps: useLessonSteps(target), location: useLocation() }), { wrapper: at("/docs/course/customer-clarity") });
    await waitFor(() => expect(result.current.location.search).toBe("?step=1"));
    act(() => result.current.steps.goToStep(2));
    await waitFor(() => expect(result.current.location.search).toBe("?step=2"));
  });
  it("keeps a departing lesson's step out of the URL of the lesson being opened", async () => {
    localStorage.setItem(progressKey("intro"), JSON.stringify({ completed: [], lastStep: 2 }));
    const previous = { ...lesson, id: "intro", slug: "introduction" };
    const { result } = renderHook(() => ({ steps: useLessonSteps(previous), location: useLocation() }), { wrapper: at("/docs/course/customer-clarity") });
    await waitFor(() => expect(result.current.steps.currentStep).toBe(2));
    expect(result.current.location.search).toBe("");
  });
});
