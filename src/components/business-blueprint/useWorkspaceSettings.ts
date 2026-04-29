import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WorkspaceSettings {
  id: string;
  sub_account_id: string;
  business_type: string;
  help_achieve: string;
  who_help: string;
  main_goal: string;
  biggest_challenge: string;
  setup_status: "pending" | "completed" | "skipped";
  currency: string;
  created_at: string;
  updated_at: string;
}

export type WorkspaceSettingsPatch = Partial<
  Omit<WorkspaceSettings, "id" | "sub_account_id" | "created_at" | "updated_at">
>;

export function useWorkspaceSettings() {
  const { activeSubAccountId } = useWorkspace();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!activeSubAccountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_settings")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .maybeSingle();

    if (error) {
      console.error("workspace settings load error", error);
      setLoading(false);
      return;
    }

    if (!data) {
      const { data: created, error: createErr } = await supabase
        .from("workspace_settings")
        .insert({ sub_account_id: activeSubAccountId } as any)
        .select()
        .single();
      if (createErr) {
        console.error("workspace settings create error", createErr);
        setLoading(false);
        return;
      }
      setSettings(created as unknown as WorkspaceSettings);
    } else {
      setSettings(data as unknown as WorkspaceSettings);
    }
    setLoading(false);
  }, [activeSubAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: WorkspaceSettingsPatch, opts?: { immediate?: boolean; silent?: boolean }) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };

        const persist = async () => {
          setSaving(true);
          const { error } = await supabase
            .from("workspace_settings")
            .update(patch as any)
            .eq("id", prev.id);
          setSaving(false);
          if (error && !opts?.silent) toast.error("Could not save settings");
        };

        if (opts?.immediate) {
          if (saveTimer.current) window.clearTimeout(saveTimer.current);
          persist();
        } else {
          if (saveTimer.current) window.clearTimeout(saveTimer.current);
          saveTimer.current = window.setTimeout(persist, 600);
        }

        return next;
      });
    },
    []
  );

  return { settings, loading, saving, update, reload: load };
}
