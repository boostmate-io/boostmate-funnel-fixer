import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  roles: string[];
  main_account_name?: string;
  sub_account_count: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);

    // Get all auth users via admin function (includes email)
    const { data: authUsers } = await supabase.rpc("get_all_users_admin");
    if (!authUsers || authUsers.length === 0) { setLoading(false); return; }

    // Get all profiles
    const { data: profiles } = await supabase.from("profiles").select("*");
    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

    // Get all roles
    const { data: roles } = await supabase.from("user_roles").select("*");
    const roleMap = new Map<string, string[]>();
    (roles || []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) || [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });

    // Get memberships
    const { data: memberships } = await supabase.from("account_memberships").select("user_id, main_account_id, sub_account_id, role");
    const mainAccountIds = new Set<string>();
    const userMainMap = new Map<string, string>();
    const userSubCount = new Map<string, number>();

    (memberships || []).forEach((m: any) => {
      if (!m.sub_account_id && m.role === "owner") {
        userMainMap.set(m.user_id, m.main_account_id);
        mainAccountIds.add(m.main_account_id);
      }
      if (m.sub_account_id) {
        userSubCount.set(m.user_id, (userSubCount.get(m.user_id) || 0) + 1);
      }
    });

    let mainNameMap = new Map<string, string>();
    const mainIds = Array.from(mainAccountIds);
    if (mainIds.length > 0) {
      const { data: mainAccs } = await supabase.from("main_accounts").select("id, name").in("id", mainIds);
      (mainAccs || []).forEach((m: any) => mainNameMap.set(m.id, m.name));
    }

    const enriched: UserRow[] = (authUsers as any[]).map((au) => {
      const profile = profileMap.get(au.id);
      return {
        id: au.id,
        email: au.email,
        display_name: profile?.display_name || "",
        created_at: au.created_at,
        roles: roleMap.get(au.id) || [],
        main_account_name: mainNameMap.get(userMainMap.get(au.id) || "") || "—",
        sub_account_count: userSubCount.get(au.id) || 0,
      };
    });

    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error("Failed to remove admin"); return; }
      toast.success("Admin role removed");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error("Failed to grant admin"); return; }
      toast.success("Admin role granted");
    }
    load();
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q) || u.main_account_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by email, name, or account..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No users found.</p>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Main Account</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.display_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.main_account_name}</TableCell>
                    <TableCell>{u.sub_account_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">{r}</Badge>
                        ))}
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${isAdmin ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => toggleAdmin(u.id, isAdmin)}
                        title={isAdmin ? "Remove admin role" : "Grant admin role"}
                      >
                        {isAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
