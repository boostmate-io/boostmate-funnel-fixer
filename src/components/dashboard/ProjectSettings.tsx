import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const ProjectSettings = () => {
  const { t } = useTranslation();
  const { activeSubAccount, renameSubAccount, mainAccount, memberships } = useWorkspace();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingMain, setEditingMain] = useState(false);
  const [editMainName, setEditMainName] = useState("");

  // Profile name fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
      if (data) {
        setFirstName((data as any).first_name || "");
        setLastName((data as any).last_name || "");
      }
      setLoadingProfile(false);
    })();
  }, [user]);

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
    const { error } = await supabase.from("main_accounts").update({ name: editMainName.trim() }).eq("id", mainAccount.id);
    if (error) {
      toast.error("Failed to rename account");
    } else {
      toast.success("Account name updated");
      window.location.reload();
    }
    setEditingMain(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    } as any).eq("id", user.id);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Profile updated");
    }
    setSavingProfile(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile name */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-foreground">Your Name</h3>
        <p className="text-sm text-muted-foreground">Update your first and last name.</p>
        {!loadingProfile && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9 text-sm" />
            </div>
            <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default ProjectSettings;
