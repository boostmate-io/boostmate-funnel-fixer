import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowRightLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface SubAccount {
  id: string;
  name: string;
  is_default: boolean;
  main_account_id: string;
  main_account_name?: string;
  created_at: string;
}

interface MainAccountOption {
  id: string;
  name: string;
  type: string;
}

const AdminSubAccounts = () => {
  const [subs, setSubs] = useState<SubAccount[]>([]);
  const [mainAccounts, setMainAccounts] = useState<MainAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMainId, setFilterMainId] = useState("all");
  const { switchSubAccount } = useWorkspace();

  // Migration dialog
  const [migrateTarget, setMigrateTarget] = useState<SubAccount | null>(null);
  const [newMainAccountId, setNewMainAccountId] = useState("");
  const [migrating, setMigrating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: subData }, { data: mainData }] = await Promise.all([
      supabase.from("sub_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("main_accounts").select("id, name, type").order("name"),
    ]);

    const mainMap = new Map((mainData || []).map((m: any) => [m.id, m.name]));
    const enriched = (subData || []).map((s: any) => ({
      ...s,
      main_account_name: mainMap.get(s.main_account_id) || "Unknown",
    }));

    setSubs(enriched);
    setMainAccounts((mainData || []) as MainAccountOption[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMigrate = async () => {
    if (!migrateTarget || !newMainAccountId) return;
    setMigrating(true);

    // Update sub_account's main_account_id
    const { error: subErr } = await supabase
      .from("sub_accounts")
      .update({ main_account_id: newMainAccountId })
      .eq("id", migrateTarget.id);

    if (subErr) {
      toast.error("Migration failed: " + subErr.message);
      setMigrating(false);
      return;
    }

    // Update all related memberships
    const { error: memErr } = await supabase
      .from("account_memberships")
      .update({ main_account_id: newMainAccountId })
      .eq("sub_account_id", migrateTarget.id);

    if (memErr) {
      toast.error("Membership update failed: " + memErr.message);
    } else {
      toast.success(`"${migrateTarget.name}" migrated successfully`);
    }

    setMigrateTarget(null);
    setNewMainAccountId("");
    setMigrating(false);
    load();
  };

  const filtered = subs.filter((s) => {
    if (filterMainId !== "all" && s.main_account_id !== filterMainId) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.main_account_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search sub accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterMainId} onValueChange={setFilterMainId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by main account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All main accounts</SelectItem>
            {mainAccounts.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name} ({m.type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No sub accounts found.</p>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Main Account</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell className="text-muted-foreground">{sub.main_account_name}</TableCell>
                  <TableCell>
                    {sub.is_default && <Badge variant="outline" className="text-xs">Default</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(sub.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setMigrateTarget(sub); setNewMainAccountId(""); }}
                      title="Migrate to another main account"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Migration Dialog */}
      <Dialog open={!!migrateTarget} onOpenChange={(open) => !open && setMigrateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migrate Sub Account</DialogTitle>
            <DialogDescription>
              Move "{migrateTarget?.name}" to a different main account. All memberships will be updated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current main account</p>
              <p className="font-medium text-sm">{migrateTarget?.main_account_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Target main account</p>
              <Select value={newMainAccountId} onValueChange={setNewMainAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target account" />
                </SelectTrigger>
                <SelectContent>
                  {mainAccounts
                    .filter((m) => m.id !== migrateTarget?.main_account_id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.type})</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrateTarget(null)}>Cancel</Button>
            <Button onClick={handleMigrate} disabled={!newMainAccountId || migrating}>
              {migrating ? "Migrating..." : "Migrate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubAccounts;
