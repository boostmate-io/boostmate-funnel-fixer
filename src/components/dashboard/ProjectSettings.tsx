import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceSettings } from "@/components/business-blueprint/useWorkspaceSettings";
import BusinessTypeSelector from "@/components/business-blueprint/BusinessTypeSelector";
import { getBusinessType, type BusinessTypeId } from "@/components/business-blueprint/businessTypes";
import { CURRENCIES } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProjectSettings = () => {
  const { t } = useTranslation();
  const { activeSubAccount, renameSubAccount, renameMainAccount, mainAccount, memberships } = useWorkspace();
  const { user } = useAuth();
  const { settings: workspaceSettings, update: updateWorkspaceSettings } = useWorkspaceSettings();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingMain, setEditingMain] = useState(false);
  const [editMainName, setEditMainName] = useState("");

  const handleRename = async () => {
    if (!editName.trim() || !activeSubAccount) return;
    await renameSubAccount(activeSubAccount.id, editName.trim());
    setEditing(false);
  };

  const isOwner = user && mainAccount && memberships.some(
    (m) => m.user_id === user.id && m.main_account_id === mainAccount.id && !m.sub_account_id && m.role === "owner"
  );

  const handleRenameMain = async () => {
    if (!editMainName.trim() || !mainAccount) return;
    const success = await renameMainAccount(editMainName.trim());
    if (!success) {
      toast.error("Failed to rename account");
    } else {
      toast.success("Account name updated");
    }
    setEditingMain(false);
  };

  return (
    <div className="space-y-6">


      {/* Main account name (owner only) */}
      {isOwner && mainAccount && (
        <div className="space-y-3">

          <h3 className="font-display font-bold text-foreground">Account Name</h3>
          <p className="text-sm text-muted-foreground">The name of your main account.</p>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            {editingMain ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  autoFocus
                  value={editMainName}
                  onChange={(e) => setEditMainName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameMain()}
                  className="h-8 text-sm"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRenameMain}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMain(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">{mainAccount.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setEditingMain(true); setEditMainName(mainAccount.name); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-6 space-y-3">
        <h3 className="font-display font-bold text-foreground">Workspace Name</h3>
        <p className="text-sm text-muted-foreground">Rename your current workspace.</p>

        {activeSubAccount && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5">
            {editing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  className="h-8 text-sm"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRename}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">{activeSubAccount.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setEditing(true); setEditName(activeSubAccount.name); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Business Type */}
      {workspaceSettings && (
        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-foreground">Business Type</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Drives examples, AI suggestions and templates across your Business Blueprint. Currently:{" "}
            <span className="font-semibold text-foreground">{getBusinessType(workspaceSettings.business_type).label}</span>
          </p>
          <BusinessTypeSelector
            value={workspaceSettings.business_type}
            onChange={(next: BusinessTypeId) =>
              updateWorkspaceSettings({ business_type: next }, { immediate: true })
            }
            variant="list"
          />
        </div>
      )}

      {/* Currency */}
      {workspaceSettings && (
        <div className="border-t border-border pt-6 space-y-3">
          <h3 className="font-display font-bold text-foreground">Currency</h3>
          <p className="text-sm text-muted-foreground">
            Used everywhere money is shown or entered across your workspace.
          </p>
          <Select
            value={workspaceSettings.currency || "EUR"}
            onValueChange={(v) => updateWorkspaceSettings({ currency: v }, { immediate: true })}
          >
            <SelectTrigger className="max-w-xs h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;
