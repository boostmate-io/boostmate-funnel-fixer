import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Copy, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

interface Redirect {
  id: string;
  name: string;
  slug: string;
  destination_url: string;
  created_at: string;
}

export const redirectBase = () => `${window.location.origin}/r`;

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const truncate = (v: string, max = 60) => (v.length > max ? `${v.slice(0, max)}…` : v);

const AdminRedirects = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Redirect | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Redirect | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("redirects")
      .select("id, name, slug, destination_url, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load redirects: " + error.message);
    setRows((data || []) as Redirect[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setName(""); setSlug(""); setDestination("");
    setDialogOpen(true);
  };

  const openEdit = (r: Redirect) => {
    setEditing(r);
    setName(r.name); setSlug(r.slug); setDestination(r.destination_url);
    setDialogOpen(true);
  };

  const copyShort = async (s: string) => {
    await navigator.clipboard.writeText(`${redirectBase()}/${s}`);
    toast.success("Short URL copied");
  };

  const handleSave = async () => {
    const cleanSlug = slugify(slug);
    const dest = destination.trim();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!cleanSlug) { toast.error("Slug is required"); return; }
    if (!/^https?:\/\/.+/i.test(dest)) { toast.error("Destination must start with http:// or https://"); return; }

    setSaving(true);
    const payload = { name: name.trim(), slug: cleanSlug, destination_url: dest };
    const { error } = editing
      ? await supabase.from("redirects").update(payload).eq("id", editing.id)
      : await supabase.from("redirects").insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);

    if (error) {
      toast.error(error.code === "23505" ? "That slug is already in use" : "Save failed: " + error.message);
      return;
    }
    toast.success(editing ? "Redirect updated" : "Redirect created");
    setDialogOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("redirects").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    await load();
  };

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Redirect
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No redirects found.</p>
      ) : (
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Short URL</TableHead>
                <TableHead>Destination URL</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">/r/{r.slug}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[280px]">
                    <span className="block truncate" title={truncate(r.destination_url, 120)}>
                      {truncate(r.destination_url)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {format(new Date(r.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy short URL" onClick={() => copyShort(r.slug)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Redirect" : "New Redirect"}</DialogTitle>
            <DialogDescription>
              Create a short Boostmate URL that forwards to a long destination URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="redirect-name">Name</Label>
              <Input
                id="redirect-name"
                placeholder="Edel Daly Onboarding"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="redirect-slug">Slug</Label>
              <Input
                id="redirect-slug"
                placeholder="edel-onboarding"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => setSlug(slugify(slug))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="redirect-destination">Destination URL</Label>
              <Textarea
                id="redirect-destination"
                placeholder="https://links.boostmate.io/widget/survey/..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="min-h-[120px] font-mono text-xs break-all"
              />
              <p className="text-xs text-muted-foreground">
                Very long URLs with many parameters are supported and stored in full.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Short URL</p>
              <p className="text-sm font-mono break-all">
                {redirectBase()}/{slugify(slug) || "your-slug"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Redirect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will stop working immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRedirects;
