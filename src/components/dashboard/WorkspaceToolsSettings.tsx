import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { MessageSquareX, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceSettings } from "@/components/business-blueprint/useWorkspaceSettings";

const WorkspaceToolsSettings = () => {
  const { activeSubAccountId } = useWorkspace();
  const { settings, update: updateSettings } = useWorkspaceSettings();
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const clearCoachHistory = async () => {
    if (!activeSubAccountId) return;
    setClearing(true);
    const { error } = await supabase
      .from("ai_coach_conversations")
      .delete()
      .eq("sub_account_id", activeSubAccountId);
    setClearing(false);
    if (error) {
      console.error(error);
      toast.error("Could not clear coach history");
      return;
    }
    toast.success("AI Coach conversation history cleared");
  };

  const resetBlueprintSetup = async () => {
    if (!settings) return;
    setResetting(true);
    await updateSettings({ setup_status: "pending" }, { immediate: true });
    setResetting(false);
    toast.success("Blueprint setup will show again next time you open the Blueprint");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-bold text-foreground">Workspace Tools</h3>
        <p className="text-sm text-muted-foreground">Reset workspace data used for onboarding and AI assistance.</p>
      </div>

      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
        <div>
          <p className="text-sm font-medium text-foreground">AI Coach history</p>
          <p className="text-xs text-muted-foreground">
            Delete all AI Coach conversations and messages in this workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={clearCoachHistory} disabled={clearing}>
          <MessageSquareX className="w-4 h-4" />
          {clearing ? "Clearing..." : "Clear history"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
        <div>
          <p className="text-sm font-medium text-foreground">Blueprint setup popup</p>
          <p className="text-xs text-muted-foreground">
            Show the business type setup wizard again the next time you open the Business Blueprint.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={resetBlueprintSetup}
          disabled={resetting || !settings}
        >
          <RotateCcw className="w-4 h-4" />
          {resetting ? "Resetting..." : "Reset setup"}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceToolsSettings;
