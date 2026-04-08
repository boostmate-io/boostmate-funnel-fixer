import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Eye, Plus, Trash2, UserPlus, Mail, Copy, Link2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface ClientAccount {
  id: string;
  agency_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface AccountInvite {
  id: string;
  client_account_id: string;
  email: string;
  invite_code: string;
  status: string;
  created_at: string;
}

const ClientAccountsView = () => {
  const { t } = useTranslation();
  const { startImpersonation } = useAgency();
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmails, setNewEmails] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite dialog
  const [inviteAccountId, setInviteAccountId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [accountInvites, setAccountInvites] = useState<AccountInvite[]>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

  // User counts per account
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("client_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts((data || []) as ClientAccount[]);
    setLoading(false);

    // Load user counts
    if (data && data.length > 0) {
      const { data: clients } = await supabase
        .from("agency_clients")
        .select("client_account_id");
      const counts: Record<string, number> = {};
      (clients || []).forEach((c: any) => {
        if (c.client_account_id) {
          counts[c.client_account_id] = (counts[c.client_account_id] || 0) + 1;
        }
      });
      setUserCounts(counts);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setCreating(false); return; }

    const { data: account, error } = await supabase
      .from("client_accounts")
      .insert({ agency_user_id: user.user.id, name: newName.trim() } as any)
      .select()
      .single();

    if (error || !account) {
      toast.error("Failed to create account");
      setCreating(false);
      return;
    }

    // Send invites if emails provided
    const emails = newEmails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
    for (const email of emails) {
      await supabase
        .from("client_account_invites")
        .insert({
          client_account_id: (account as any).id,
          agency_user_id: user.user.id,
          email,
        } as any);
    }

    toast.success("Account created");
    setNewName("");
    setNewEmails("");
    setShowCreate(false);
    setCreating(false);
    loadAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    await supabase.from("client_accounts").delete().eq("id", id);
    toast.success("Account deleted");
    loadAccounts();
  };

  const loadAccountInvites = useCallback(async (accountId: string) => {
    const { data } = await supabase
      .from("client_account_invites")
      .select("*")
      .eq("client_account_id", accountId)
      .order("created_at", { ascending: false });
    setAccountInvites((data || []) as AccountInvite[]);
  }, []);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteAccountId) return;
    setSendingInvite(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setSendingInvite(false); return; }

    const { error } = await supabase
      .from("client_account_invites")
      .insert({
        client_account_id: inviteAccountId,
        agency_user_id: user.user.id,
        email: inviteEmail.trim(),
      } as any);

    if (error) {
      toast.error("Failed to send invite");
    } else {
      toast.success("Invite sent");
      setInviteEmail("");
      loadAccountInvites(inviteAccountId);
    }
    setSendingInvite(false);
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const openInviteDialog = (accountId: string) => {
    setInviteAccountId(accountId);
    setInviteEmail("");
    loadAccountInvites(accountId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Client Accounts</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Account
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No client accounts yet.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {userCounts[account.id] || 0} user(s) · Created {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInviteDialog(account.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Invite User
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startImpersonation(account.id, account.name)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
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
      <Dialog open={!!inviteAccountId} onOpenChange={(open) => !open && setInviteAccountId(null)}>
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
                {accountInvites.map((inv) => (
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
