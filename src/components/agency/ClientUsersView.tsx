import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";

interface MemberUser {
  membership_id: string;
  user_id: string;
  sub_account_id: string | null;
  role: string;
  sub_account_name: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email?: string;
}

const ClientUsersView = () => {
  const { mainAccount, subAccounts } = useWorkspace();
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState<string>("all");

  const loadData = useCallback(async () => {
    if (!mainAccount) return;
    setLoading(true);

    // Get all memberships for this main account that have a sub_account_id
    const { data: memberships } = await supabase
      .from("account_memberships")
      .select("id, user_id, sub_account_id, role")
      .eq("main_account_id", mainAccount.id)
      .not("sub_account_id", "is", null);

    if (!memberships || memberships.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs and fetch profiles
    const userIds = [...new Set(memberships.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, display_name")
      .in("id", userIds);

    // Build sub account name map
    const subMap: Record<string, string> = {};
    subAccounts.forEach((s) => { subMap[s.id] = s.name; });

    const enriched: MemberUser[] = memberships.map((m: any) => {
      const profile = (profiles || []).find((p: any) => p.id === m.user_id);
      return {
        membership_id: m.id,
        user_id: m.user_id,
        sub_account_id: m.sub_account_id,
        role: m.role,
        sub_account_name: m.sub_account_id ? subMap[m.sub_account_id] || "Unknown" : "—",
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        display_name: profile?.display_name || "",
      };
    });

    setUsers(enriched);
    setLoading(false);
  }, [mainAccount, subAccounts]);

  useEffect(() => { loadData(); }, [loadData]);

  const getName = (u: MemberUser) => {
    const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
    return full || u.display_name || "Unknown User";
  };

  const filtered = users.filter((u) => {
    const name = getName(u).toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || u.user_id.includes(search.toLowerCase());
    const matchAccount = filterAccount === "all" || u.sub_account_id === filterAccount;
    return matchSearch && matchAccount;
  });

  // Deduplicate: show each user once, with all their workspace badges
  const userMap = new Map<string, { user: MemberUser; workspaces: { name: string; role: string }[] }>();
  filtered.forEach((u) => {
    const existing = userMap.get(u.user_id);
    if (existing) {
      existing.workspaces.push({ name: u.sub_account_name, role: u.role });
    } else {
      userMap.set(u.user_id, { user: u, workspaces: [{ name: u.sub_account_name, role: u.role }] });
    }
  });

  const uniqueUsers = Array.from(userMap.values());

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
            {subAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : uniqueUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {uniqueUsers.map(({ user, workspaces }) => (
            <Card key={user.user_id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                    {getName(user)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{getName(user)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {workspaces.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {w.name} ({w.role})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientUsersView;
