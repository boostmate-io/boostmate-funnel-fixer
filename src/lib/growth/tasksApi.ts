// Growth Roadmap V2 — task catalog + progress data access.

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

/** Upsert progress for a task in a workspace. */
export async function setTaskStatus(
  subAccountId: string,
  taskId: string,
  status: TaskStatus,
): Promise<GrowthTaskProgressRow> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    sub_account_id: subAccountId,
    task_id: taskId,
    status,
  };
  if (status === "in_progress") patch.started_at = now;
  if (status === "completed") patch.completed_at = now;

  const { data, error } = await supabase
    .from("growth_task_progress")
    .upsert(patch, { onConflict: "sub_account_id,task_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as GrowthTaskProgressRow;
}
