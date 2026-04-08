import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  roles: string[];
  main_account_name?: string;
  sub_account_count: number;
}

interface UserMembership {
  id: string;
  main_account_id: string;
  main_account_name: string;
  sub_account_id: string | null;
  sub_account_name: string | null;
  role: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    setLoading(true);

    const { data: authUsers } = await supabase.rpc("get_all_users_admin");
    if (!authUsers || authUsers.length === 0) { setLoading(false); return; }

    const { data: profiles } = await supabase.from("profiles").select("*");
    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

    const { data: roles } = await supabase.from("user_roles").select("*");
    const roleMap = new Map<string, string[]>();
    (roles || []).forEach((r: any) => {
      const list = roleMap.get(r.user_id) || [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });

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
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
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

  const openUserDetail = async (user: UserRow) => {
    setSelectedUser(user);
    setLoadingDetail(true);

    // Load all memberships for this user
    const { data: mems } = await supabase
      .from("account_memberships")
      .select("id, main_account_id, sub_account_id, role")
      .eq("user_id", user.id);

    if (!mems) { setLoadingDetail(false); return; }

    const mainIds = [...new Set(mems.map((m: any) => m.main_account_id))];
    const subIds = mems.filter((m: any) => m.sub_account_id).map((m: any) => m.sub_account_id);

    const [{ data: mains }, { data: subs }] = await Promise.all([
      supabase.from("main_accounts").select("id, name").in("id", mainIds),
      subIds.length > 0
        ? supabase.from("sub_accounts").select("id, name").in("id", subIds)
        : Promise.resolve({ data: [] }),
    ]);

    const mainMap = new Map((mains || []).map((m: any) => [m.id, m.name]));
    const subMap = new Map((subs || []).map((s: any) => [s.id, s.name]));

    const enriched: UserMembership[] = mems.map((m: any) => ({
      id: m.id,
      main_account_id: m.main_account_id,
      main_account_name: mainMap.get(m.main_account_id) || "Unknown",
      sub_account_id: m.sub_account_id,
      sub_account_name: m.sub_account_id ? (subMap.get(m.sub_account_id) || "Unknown") : null,
      role: m.role,
    }));

    setUserMemberships(enriched);
    setLoadingDetail(false);
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Admin role removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast.success("Admin role granted");
    }
    load();
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser((prev) => prev ? {
        ...prev,
        roles: isAdmin ? prev.roles.filter((r) => r !== "admin") : [...prev.roles, "admin"],
      } : null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { target_user_id: selectedUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("User deleted successfully");
      setSelectedUser(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Error deleting user");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q) || u.main_account_name?.toLowerCase().includes(q);
  });

  // Detail view
  if (selectedUser) {
    const isAdmin = selectedUser.roles.includes("admin");
    return (
      <div className="space-y-4 mt-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to users
        </Button>

        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedUser.first_name || selectedUser.last_name
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim()
                    : "No name set"}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedUser.roles.map((r) => (
                  <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Main Account</p>
                <p className="font-medium">{selectedUser.main_account_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="font-medium">{format(new Date(selectedUser.created_at), "dd MMM yyyy HH:mm")}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                variant={isAdmin ? "destructive" : "default"}
                size="sm"
                onClick={() => toggleAdmin(selectedUser.id, isAdmin)}
              >
                {isAdmin ? <><ShieldOff className="w-4 h-4 mr-1" /> Remove Admin</> : <><ShieldCheck className="w-4 h-4 mr-1" /> Grant Admin</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="font-semibold text-foreground mb-3">Account Memberships</h3>
          {loadingDetail ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : userMemberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memberships found.</p>
          ) : (
            <div className="bg-card rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Main Account</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userMemberships.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.main_account_name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.sub_account_name || "— (account level)"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{m.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openUserDetail(u)}
                >
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : "—"}
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
