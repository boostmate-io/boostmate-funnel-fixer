// Growth Roadmap V2 — task catalog + progress data access.
//
// Progress rows are cycle-scoped for stage tasks and cycle-less for
// foundation tasks. `setTaskStatus` writes `cycle_id = null` for
// `stage === "any"` tasks and the active cycle id otherwise.

import { supabase } from "@/integrations/supabase/client";
import type { GrowthRoadmapTaskRow, GrowthTaskProgressRow, TaskStatus } from "./taskTypes";

export async function fetchActiveTasks(): Promise<GrowthRoadmapTaskRow[]> {
  const { data, error } = await supabase
    .from("growth_roadmap_tasks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as GrowthRoadmapTaskRow[];
}

export async function fetchProgressForWorkspace(subAccountId: string): Promise<GrowthTaskProgressRow[]> {
  const { data, error } = await supabase
    .from("growth_task_progress")
    .select("*")
    .eq("sub_account_id", subAccountId);
  if (error) throw error;
  return (data ?? []) as unknown as GrowthTaskProgressRow[];
}

/** Upsert progress for a task in a workspace.
 *  - Foundation tasks (`stage === "any"`) → cycle_id = null.
 *  - Stage tasks → cycle_id = the workspace's active cycle id (required).
 */
export async function setTaskStatus(
  subAccountId: string,
  taskId: string,
  status: TaskStatus,
  cycleId: string | null,
): Promise<GrowthTaskProgressRow> {
  const now = new Date().toISOString();
  const patch = {
    sub_account_id: subAccountId,
    task_id: taskId,
    cycle_id: cycleId,
    status,
    ...(status === "in_progress" ? { started_at: now } : {}),
    ...(status === "completed" ? { completed_at: now } : {}),
  };

  const { data, error } = await supabase
    .from("growth_task_progress")
    .upsert(patch, { onConflict: "sub_account_id,task_id,cycle_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as GrowthTaskProgressRow;
}
