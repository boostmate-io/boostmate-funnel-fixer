// =============================================================================
// askCoachForTask — global "Ask Coach" trigger for Growth Roadmap tasks.
//
// The Roadmap surfaces (`GrowthPlanPanel`, `GrowthRoadmapOverview` focus card)
// call `askCoachForTask({...})` when the user clicks the CTA on a task that
// has a `coach_prompt_ref`. This dispatches a window event that the mounted
// `GlobalCoachBubble` listens for — it then opens the Coach, scopes the
// conversation to that specific task, and auto-seeds a natural task-specific
// user message. The admin-managed instruction block referenced by
// `coach_prompt_ref` is resolved server-side and injected into the system
// prompt — never shown as if the user typed it.
// =============================================================================

export const COACH_OPEN_FOR_TASK_EVENT = "coach:openForTask";

export interface CoachOpenForTaskDetail {
  taskSlug: string;
  taskTitle: string;
  coachPromptRef: string | null;
}

export function askCoachForTask(detail: CoachOpenForTaskDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COACH_OPEN_FOR_TASK_EVENT, { detail }));
}

/** Natural, task-specific opener shown as if the user asked for help.
 *  The internal instruction content is NEVER placed here. */
export function buildTaskSeedMessage(taskTitle: string, locale: string | undefined): string {
  const nl = (locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  return nl
    ? `Help me met deze roadmap-taak: **${taskTitle}**.`
    : `Help me work through this roadmap task: **${taskTitle}**.`;
}
