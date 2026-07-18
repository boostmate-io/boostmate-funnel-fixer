// =============================================================================
// GlobalCoachBubble — floating "Growth Strategist" entry point.
// Uses the SAME CoachPanel + coach-chat engine as every scoped Coach entry.
// Additionally grounds the Coach in the workspace's cycle-aware Growth Plan
// via `roadmapSnapshot` on the CoachContext.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import CoachPanel from "@/components/coach/CoachPanel";
import { buildGlobalContext } from "@/lib/coach/buildContext";
import { buildRoadmapSnapshot } from "@/lib/coach/buildRoadmapSnapshot";
import { applyBlueprintWrites } from "@/lib/coach/applyBlueprintWrites";
import type { CoachBlueprintWrite, CoachContext, CoachGrowthDecision } from "@/lib/coach/types";
import type { BlueprintRow } from "@/components/business-blueprint/types";
import { useGrowthPlan } from "@/lib/growth/useGrowthPlan";
import { readActiveForWorkspace } from "@/lib/growth/api";
import { buildDecisionPatch, DECISION_SPECS } from "@/lib/growth/decisionOptions";
import { setWorkspaceState } from "@/lib/growth/cycleService";
import type { GrowthAssessmentRow } from "@/lib/growth/types";
import {
  COACH_OPEN_FOR_TASK_EVENT,
  buildTaskSeedMessage,
  type CoachOpenForTaskDetail,
} from "@/lib/coach/askCoachForTask";
import i18n from "@/i18n";

const GlobalCoachBubble = () => {
  const [open, setOpen] = useState(false);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [assessment, setAssessment] = useState<GrowthAssessmentRow | null>(null);
  const [taskFocus, setTaskFocus] = useState<CoachOpenForTaskDetail | null>(null);
  const { activeSubAccountId } = useWorkspace();
  const location = useLocation();

  // Listen for "Ask Coach" CTAs from the Growth Roadmap. Opens the panel and
  // scopes the conversation to that specific task; the auto-seed message and
  // the admin-managed instruction block referenced by `coachPromptRef` are
  // wired below.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoachOpenForTaskDetail>).detail;
      if (!detail || !detail.taskSlug) return;
      setTaskFocus(detail);
      setOpen(true);
    };
    window.addEventListener(COACH_OPEN_FOR_TASK_EVENT, handler);
    return () => window.removeEventListener(COACH_OPEN_FOR_TASK_EVENT, handler);
  }, []);

  // Closing the panel clears the task focus so the next open reverts to the
  // generic Growth Strategist scope.
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setTaskFocus(null);
  }, []);


  // Blueprint fetch
  useEffect(() => {
    let cancelled = false;
    if (!activeSubAccountId) {
      setBlueprint(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("business_blueprints")
        .select("*")
        .eq("sub_account_id", activeSubAccountId)
        .maybeSingle();
      if (!cancelled) setBlueprint((data as unknown as BlueprintRow) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSubAccountId, open]);

  // Active assessment fetch — needed to derive the Growth Plan snapshot.
  useEffect(() => {
    let cancelled = false;
    if (!activeSubAccountId) {
      setAssessment(null);
      return;
    }
    (async () => {
      try {
        const row = await readActiveForWorkspace(activeSubAccountId);
        if (!cancelled) setAssessment(row);
      } catch {
        if (!cancelled) setAssessment(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSubAccountId, open]);

  const { plan, activeCycle, workspaceState, refresh } = useGrowthPlan(
    activeSubAccountId,
    assessment,
  );

  const roadmapSnapshot = useMemo(() => {
    if (!activeSubAccountId) return null;
    // Even without an active cycle we pass foundation + workspace state so
    // the Coach can nudge the user through the assessment/bootstrap path.
    return buildRoadmapSnapshot({ plan, activeCycle, workspaceState });
  }, [activeSubAccountId, plan, activeCycle, workspaceState]);

  const context = useMemo(() => {
    if (!activeSubAccountId) return null;
    const params = new URLSearchParams(location.search);
    const module = params.get("module") ?? "overview";
    return buildGlobalContext(
      blueprint,
      activeSubAccountId,
      `Route: ${location.pathname} · module: ${module}`,
      roadmapSnapshot,
    );
  }, [activeSubAccountId, blueprint, location.pathname, location.search, roadmapSnapshot]);

  const handleApplyBlueprintWrites = useCallback(
    async (writes: CoachBlueprintWrite[]) => {
      if (!activeSubAccountId) return;
      const res = await applyBlueprintWrites(activeSubAccountId, writes);
      if (res.error) {
        toast.error(`Kon Blueprint niet bijwerken: ${res.error}`);
      } else {
        toast.success(`${res.applied} veld(en) bijgewerkt`);
        const { data } = await supabase
          .from("business_blueprints")
          .select("*")
          .eq("sub_account_id", activeSubAccountId)
          .maybeSingle();
        setBlueprint((data as unknown as BlueprintRow) ?? null);
      }
    },
    [activeSubAccountId],
  );

  const handleApplyGrowthDecision = useCallback(
    async (decision: CoachGrowthDecision) => {
      if (!activeSubAccountId) return;
      // Validate against the canonical spec — the server also validates,
      // but a client-side guard prevents an obviously bad write.
      const spec = DECISION_SPECS[decision.taskSlug];
      if (!spec || spec.stateKey !== decision.stateKey) {
        toast.error("Ongeldig roadmap-besluit.");
        return;
      }
      const value = decision.value?.trim();
      if (!value) {
        toast.error("Geen waarde opgegeven.");
        return;
      }
      if (!spec.freeText && !spec.options?.some((o) => o.value === value)) {
        toast.error("Waarde niet in de toegestane opties.");
        return;
      }
      try {
        await setWorkspaceState({
          subAccountId: activeSubAccountId,
          patch: buildDecisionPatch(spec.stateKey, value),
        });
        toast.success("Roadmap-besluit opgeslagen");
        await refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Opslaan mislukt";
        toast.error(msg);
      }
    },
    [activeSubAccountId, refresh],
  );

  if (!activeSubAccountId) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Growth Strategist"
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-[1.03] transition-all"
        >
          <span className="w-7 h-7 rounded-full bg-primary-foreground/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="text-sm font-semibold">Coach</span>
        </button>
      )}


      <CoachPanel
        open={open}
        onOpenChange={setOpen}
        context={context}
        onApplyBlueprintWrites={handleApplyBlueprintWrites}
        onApplyGrowthDecision={handleApplyGrowthDecision}
      />
    </>
  );
};

export default GlobalCoachBubble;
