import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Eye, Plus, Trash2, UserPlus, Mail, Link2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const ClientAccountsView = () => {
  const { t } = useTranslation();
  const { mainAccount, subAccounts: allSubAccounts, switchSubAccount, createClientSubAccount, activeSubAccountId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmails, setNewEmails] = useState("");
  const [creating, setCreating] = useState(false);

  const [inviteSubAccountId, setInviteSubAccountId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [accountInvites, setAccountInvites] = useState<any[]>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Show ALL sub-accounts (including the agency's own default one)
  const subAccounts = allSubAccounts;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const newSub = await createClientSubAccount(newName.trim());
    if (!newSub) {
      toast.error("Failed to create account");
      setCreating(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user && mainAccount) {
      await supabase.from("account_memberships").insert({
        user_id: userData.user.id,
        main_account_id: mainAccount.id,
        sub_account_id: newSub.id,
        role: "workspace_admin",
      });
    }

    const emails = newEmails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
    if (emails.length > 0 && userData.user && mainAccount) {
      for (const email of emails) {
        await supabase.from("account_invites").insert({
          main_account_id: mainAccount.id,
          sub_account_id: newSub.id,
          email,
          invited_by: userData.user.id,
          role: "workspace_member",
        });
      }
    }

    toast.success("Account created");
    setNewName("");
    setNewEmails("");
    setShowCreate(false);
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    await supabase.from("sub_accounts").delete().eq("id", id);
    toast.success("Account deleted");
  };

  const loadAccountInvites = useCallback(async (subAccountId: string) => {
    if (!mainAccount) return;
    const { data } = await supabase
      .from("account_invites")
      .select("*")
      .eq("main_account_id", mainAccount.id)
      .eq("sub_account_id", subAccountId)
      .order("created_at", { ascending: false });
    setAccountInvites(data || []);
  }, [mainAccount]);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteSubAccountId || !mainAccount) return;
    setSendingInvite(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSendingInvite(false); return; }

    const { error } = await supabase.from("account_invites").insert({
      main_account_id: mainAccount.id,
      sub_account_id: inviteSubAccountId,
      email: inviteEmail.trim(),
      invited_by: userData.user.id,
      role: "workspace_member",
    });

    if (error) {
      toast.error("Failed to send invite");
    } else {
      toast.success("Invite sent");
      setInviteEmail("");
      loadAccountInvites(inviteSubAccountId);
    }
    setSendingInvite(false);
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const openInviteDialog = (subAccountId: string) => {
    setInviteSubAccountId(subAccountId);
    setInviteEmail("");
    loadAccountInvites(subAccountId);
  };

  const handleManage = (subAccountId: string) => {
    const sub = allSubAccounts.find(s => s.id === subAccountId);
    switchSubAccount(subAccountId);
    toast.success(`Switched to ${sub?.name || "workspace"}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Account
        </Button>
      </div>

      {subAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No accounts yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subAccounts.map((account) => (
            <Card key={account.id} className={account.id === activeSubAccountId ? "border-primary" : ""}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{account.name}</p>
                      {account.is_default && (
                        <Badge variant="secondary" className="text-[10px]">Internal</Badge>
                      )}
                      {account.id === activeSubAccountId && (
                        <Badge className="text-[10px]">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInviteDialog(account.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                  )}
                  {account.id !== activeSubAccountId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManage(account.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  )}
                  {!account.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client Account</DialogTitle>
            <DialogDescription>
              Create a new managed client account. You can optionally invite users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Account Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Invite Users (optional)</label>
              <p className="text-xs text-muted-foreground mb-1">
                Enter email addresses separated by commas. They'll receive an invite.
              </p>
              <Input
                value={newEmails}
                onChange={(e) => setNewEmails(e.target.value)}
                placeholder="user@example.com, another@example.com"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Users Dialog */}
      <Dialog open={!!inviteSubAccountId} onOpenChange={(open) => !open && setInviteSubAccountId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User to Account</DialogTitle>
            <DialogDescription>
              Send an invite to add a user to this client account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button onClick={handleSendInvite} disabled={sendingInvite || !inviteEmail.trim()}>
                <Mail className="w-4 h-4 mr-1" />
                Send
              </Button>
            </div>

            {accountInvites.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Pending Invites</p>
                {accountInvites.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                    <div>
                      <p className="text-foreground">{inv.email}</p>
                      <Badge variant={inv.status === "accepted" ? "default" : "secondary"} className="text-xs mt-0.5">
                        {inv.status}
                      </Badge>
                    </div>
                    {inv.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.invite_code)}>
                        <Link2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientAccountsView;
