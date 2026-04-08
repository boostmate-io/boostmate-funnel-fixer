import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface ClientUser {
  id: string;
  client_user_id: string;
  client_account_id: string | null;
  status: string;
  created_at: string;
  profile?: {
    display_name: string;
    account_type: string;
  } | null;
  account_name?: string;
}

interface ClientAccount {
  id: string;
  name: string;
}

const ClientUsersView = () => {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load accounts
    const { data: accs } = await supabase
      .from("client_accounts")
      .select("id, name");
    setAccounts((accs || []) as ClientAccount[]);

    // Load all agency_clients (users linked to this agency)
    const { data: clients } = await supabase
      .from("agency_clients")
      .select("*");

    if (clients && clients.length > 0) {
      const userIds = clients.map((c: any) => c.client_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, account_type")
        .in("id", userIds);

      const accountMap: Record<string, string> = {};
      (accs || []).forEach((a: any) => { accountMap[a.id] = a.name; });

      const enriched = clients.map((c: any) => ({
        ...c,
        profile: (profiles || []).find((p: any) => p.id === c.client_user_id) || null,
        account_name: c.client_account_id ? accountMap[c.client_account_id] || "Unknown" : "Unassigned",
      }));
      setUsers(enriched);
    } else {
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRemoveUser = async (id: string) => {
    if (!confirm("Remove this user from your agency?")) return;
    await supabase.from("agency_clients").delete().eq("id", id);
    toast.success("User removed");
    loadData();
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.profile?.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.client_user_id.toLowerCase().includes(search.toLowerCase());
    const matchAccount = filterAccount === "all" || u.client_account_id === filterAccount;
    return matchSearch && matchAccount;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-9"
          />
        </div>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const isSelf = user.client_user_id === user.id; // agency's own record
            return (
              <Card key={user.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {(user.profile?.display_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.profile?.display_name || "Unknown User"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{user.account_name}</Badge>
                        <Badge variant="secondary" className="text-xs">{user.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveUser(user.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientUsersView;
