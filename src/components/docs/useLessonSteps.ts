import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DocNode } from "@/lib/docs/docContent";
import { progressKey, readProgress, requestedStep, splitLessonSteps, toggleCompleted, type LessonProgress } from "@/lib/docs/lessonSteps";

export const useLessonSteps = (lesson: { id: string; content: DocNode; step_by_step: boolean } | null) => {
  const location = useLocation();
  const navigate = useNavigate();
  const steps = useMemo(() => splitLessonSteps(lesson?.content ?? { type: "doc" }), [lesson?.content]);
  const initial = useMemo(() => lesson ? readProgress(lesson.id, steps.length) : { completed: [], lastStep: 1 }, [lesson?.id, steps.length]);
  const [stored, setStored] = useState<{ id: string; progress: LessonProgress } | null>(null);
  const progress = stored?.id === lesson?.id ? stored.progress : initial;
  let hash = "";
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed link */ }
  const hashStep = steps.findIndex((s) => s.headingIds.includes(hash));
  const currentStep = requestedStep(new URLSearchParams(location.search).get("step"), steps.length)
    ?? (hashStep >= 0 ? hashStep + 1 : progress.lastStep);

  useEffect(() => {
    if (!lesson?.step_by_step) return;
    if (requestedStep(new URLSearchParams(location.search).get("step"), steps.length) === null) {
      const params = new URLSearchParams(location.search);
      params.set("step", String(currentStep));
      navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
    }
    const next = { completed: progress.completed, lastStep: currentStep };
    if (progress.lastStep !== currentStep) setStored({ id: lesson.id, progress: next });
    try { localStorage.setItem(progressKey(lesson.id), JSON.stringify(next)); } catch { /* Storage may be disabled. Navigation still works. */ }
  }, [lesson?.id, lesson?.step_by_step, currentStep, progress, location.pathname, location.search, location.hash, steps.length, navigate]);

  const goToStep = (step: number, heading?: string) => {
    const params = new URLSearchParams(location.search);
    params.set("step", String(step));
    navigate({ pathname: location.pathname, search: params.toString(), hash: heading ? `#${heading}` : "" });
  };
  const toggle = () => {
    if (!lesson) return;
    setStored({ id: lesson.id, progress: { lastStep: currentStep, completed: toggleCompleted(progress.completed, currentStep) } });
  };
  return { steps, currentStep, completed: progress.completed, goToStep, toggle, hash };
};