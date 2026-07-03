// =============================================================================
// GlobalCoachBubble — floating "Growth Strategist" entry point.
// Uses the SAME CoachPanel + coach-chat engine as every scoped Coach entry.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import CoachPanel from "@/components/coach/CoachPanel";
import { buildGlobalContext } from "@/lib/coach/buildContext";
import { applyBlueprintWrites } from "@/lib/coach/applyBlueprintWrites";
import type { CoachBlueprintWrite } from "@/lib/coach/types";
import type { BlueprintRow } from "@/components/business-blueprint/types";

const GlobalCoachBubble = () => {
  const [open, setOpen] = useState(false);
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const { activeSubAccountId } = useWorkspace();
  const location = useLocation();

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

  const context = useMemo(() => {
    if (!activeSubAccountId) return null;
    const params = new URLSearchParams(location.search);
    const module = params.get("module") ?? "overview";
    return buildGlobalContext(blueprint, activeSubAccountId, `Route: ${location.pathname} · module: ${module}`);
  }, [activeSubAccountId, blueprint, location.pathname, location.search]);

  const handleApplyBlueprintWrites = useCallback(
    async (writes: CoachBlueprintWrite[]) => {
      if (!activeSubAccountId) return;
      const res = await applyBlueprintWrites(activeSubAccountId, writes);
      if (res.error) {
        toast.error(`Kon Blueprint niet bijwerken: ${res.error}`);
      } else {
        toast.success(`${res.applied} veld(en) bijgewerkt`);
        // Refresh local snapshot so subsequent turns see the new values.
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

  if (!activeSubAccountId) return null;

  return (
    <>
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

      <CoachPanel
        open={open}
        onOpenChange={setOpen}
        context={context}
        onApplyBlueprintWrites={handleApplyBlueprintWrites}
      />
    </>
  );
};

export default GlobalCoachBubble;
