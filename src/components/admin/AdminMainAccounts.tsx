import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface MainAccount {
  id: string;
  name: string;
  type: "standard" | "agency";
  created_at: string;
  sub_count?: number;
  member_count?: number;
}

const AdminMainAccounts = () => {
  const [accounts, setAccounts] = useState<MainAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { switchSubAccount } = useWorkspace();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("main_accounts").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load accounts"); setLoading(false); return; }

    const enriched: MainAccount[] = [];
    for (const acc of data || []) {
      const { count: subCount } = await supabase.from("sub_accounts").select("*", { count: "exact", head: true }).eq("main_account_id", acc.id);
      const { count: memberCount } = await supabase.from("account_memberships").select("*", { count: "exact", head: true }).eq("main_account_id", acc.id).is("sub_account_id", null);
      enriched.push({ ...acc, sub_count: subCount || 0, member_count: memberCount || 0 });
    }
    setAccounts(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("main_accounts").delete().eq("id", id);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    toast.success("Main account deleted");
    load();
  };

  const handleToggleType = async (acc: MainAccount) => {
    const newType = acc.type === "agency" ? "standard" : "agency";
    if (newType === "standard" && (acc.sub_count || 0) > 1) {
      toast.error("Cannot switch to standard: account has multiple sub accounts. Remove extras first.");
      return;
    }
    const { error } = await supabase.from("main_accounts").update({ type: newType }).eq("id", acc.id);
    if (error) { toast.error("Failed to update type: " + error.message); return; }
    toast.success(`Account type changed to ${newType}`);
    load();
  };

  const handleManage = async (mainAccountId: string) => {
    const { data } = await supabase
      .from("sub_accounts")
      .select("id")
      .eq("main_account_id", mainAccountId)
      .eq("is_default", true)
      .single();
    if (data) {
      switchSubAccount(data.id);
      toast.success("Switched to account's default workspace");
    } else {
      const { data: firstSub } = await supabase
        .from("sub_accounts")
        .select("id")
        .eq("main_account_id", mainAccountId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (firstSub) {
        switchSubAccount(firstSub.id);
        toast.success("Switched to account workspace");
      } else {
        toast.error("No workspaces found for this account");
      }
    }
  };

  const filtered = accounts.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.id.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No main accounts found.</p>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub Accounts</TableHead>
                <TableHead>Owners</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={acc.type === "agency" ? "default" : "secondary"}
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleToggleType(acc)}
                      title={`Click to switch to ${acc.type === "agency" ? "standard" : "agency"}`}
                    >
                      {acc.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{acc.sub_count}</TableCell>
                  <TableCell>{acc.member_count}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(acc.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleManage(acc.id)} title="Manage this account">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete main account?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{acc.name}" and all associated data. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(acc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminMainAccounts;
