import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, FileText, Mail, Video, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LinkedDocumentsGrid, { LinkedDocument, FrameworkInfo } from "./linked/LinkedDocumentsGrid";
import { resolveDocumentThumbnails } from "@/lib/copy/documentThumbnail";
import CopyDocumentEditor from "./CopyDocumentEditor";

interface CopyDocument extends LinkedDocument {
  framework_id?: string | null;
}

interface FrameworkRow {
  id: string;
  name: string;
  type: string;
  component_slugs: any;
}

const DOCUMENT_TYPES = [
  { type: "sales_copy", icon: FileText, label: "Sales Copy" },
  { type: "email_sequence", icon: Mail, label: "Email Sequences" },
  { type: "vsl_script", icon: Video, label: "VSL Scripts" },
  { type: "meta_ad", icon: Megaphone, label: "Meta Ads" },
  { type: "generic", icon: FileText, label: "Generic" },
];

const GENERIC_TYPE = "generic";

const CopyDocumentsModule = () => {
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CopyDocument[]>([]);
  const [frameworks, setFrameworks] = useState<FrameworkRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string | undefined>>({});
  const [activeType, setActiveType] = useState("sales_copy");
  const [selectedDoc, setSelectedDoc] = useState<CopyDocument | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFrameworkId, setPickerFrameworkId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user || !activeSubAccountId) return;
    const [{ data: docs }, { data: fws }] = await Promise.all([
      supabase
        .from("copy_documents")
        .select("id, name, type, status, framework_id, updated_at")
        .eq("sub_account_id", activeSubAccountId)
        .order("updated_at", { ascending: false }),
      supabase.from("copy_frameworks").select("id, name, type, component_slugs").eq("is_active", true),
    ]);
    const docList = (docs || []) as unknown as CopyDocument[];
    setDocuments(docList);
    setFrameworks((fws || []) as FrameworkRow[]);
    if (docList.length > 0) {
      const thumbs = await resolveDocumentThumbnails(docList.map((d) => d.id));
      setThumbnails(thumbs);
    } else {
      setThumbnails({});
    }
  }, [user, activeSubAccountId]);

  useEffect(() => { load(); }, [load]);

  // Deep-linking from funnel node "Open document".
  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (typeof id !== "string" || !id) return;
      const { data } = await supabase
        .from("copy_documents")
        .select("id, name, type, status, framework_id, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setActiveType((data as any).type);
        setSelectedDoc(data as unknown as CopyDocument);
      }
    };
    window.addEventListener("boostmate:open-copy-document", handler);
    return () => window.removeEventListener("boostmate:open-copy-document", handler);
  }, []);

  const frameworksForActiveType = useMemo(
    () => frameworks.filter((f) => f.type === activeType),
    [frameworks, activeType],
  );

  const frameworkById = useMemo(() => {
    const m: Record<string, FrameworkRow> = {};
    for (const f of frameworks) m[f.id] = f;
    return m;
  }, [frameworks]);

  // For the grid card badge: prefer the doc's own framework, fall back to
  // the first framework matching its type.
  const frameworkByType = useMemo(() => {
    const m: Record<string, FrameworkInfo | undefined> = {};
    for (const f of frameworks) if (!m[f.type]) m[f.type] = { id: f.id, name: f.name, type: f.type };
    return m;
  }, [frameworks]);

  const genericFramework = useMemo(
    () => frameworks.find((f) => f.type === GENERIC_TYPE),
    [frameworks],
  );

  const openPicker = () => {
    // No framework registered for this type → fall back to the generic one.
    if (frameworksForActiveType.length === 0) {
      if (!genericFramework) {
        toast.error("No framework available. Create one in Admin → Copy Frameworks.");
        return;
      }
      createDocument(genericFramework.id, activeType);
      return;
    }
    if (frameworksForActiveType.length === 1) {
      createDocument(frameworksForActiveType[0].id, activeType);
      return;
    }
    setPickerFrameworkId(frameworksForActiveType[0].id);
    setPickerOpen(true);
  };

  const createDocument = async (frameworkId: string, typeOverride?: string) => {
    if (!user || !activeSubAccountId) return;
    const framework = frameworkById[frameworkId];
    if (!framework) { toast.error("Framework not found"); return; }
    // When creating a doc under a specific tab (e.g. "Sales Copy") but using
    // the Generic framework as fallback, keep the doc under the active tab.
    const docType = typeOverride || framework.type;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("copy_documents")
        .insert({
          user_id: user.id,
          sub_account_id: activeSubAccountId,
          name: `Untitled ${framework.name}`,
          type: docType,
          framework_id: framework.id,
          status: "draft",
        } as any)
        .select("id, name, type, status, framework_id, updated_at")
        .single();
      if (error || !data) throw error;

      const slugs: string[] = Array.isArray(framework.component_slugs)
        ? framework.component_slugs
        : (framework.component_slugs?.slugs || []);
      if (slugs.length > 0) {
        const rows = slugs.map((slug, i) => ({
          document_id: (data as any).id,
          component_slug: slug,
          sort_order: i,
          inputs: {},
          outputs: {},
          is_generated: false,
        }));
        await supabase.from("copy_document_components").insert(rows as any);
      }
      setPickerOpen(false);
      setDocuments((prev) => [data as unknown as CopyDocument, ...prev]);
      setSelectedDoc(data as unknown as CopyDocument);
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm("Delete this document permanently?")) return;
    const { error } = await supabase.from("copy_documents").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
      toast.success("Document deleted");
    }
  };

  const duplicateDocument = async (id: string) => {
    if (!user || !activeSubAccountId) return;
    const { data: src, error: srcErr } = await supabase
      .from("copy_documents")
      .select("name, type, framework_id, context_type, context_offer_id, context_custom_text, global_instructions, funnel_id, funnel_node_id")
      .eq("id", id)
      .single();
    if (srcErr || !src) { toast.error("Duplicate failed"); return; }
    const { data: newDoc, error: insErr } = await supabase
      .from("copy_documents")
      .insert({
        user_id: user.id,
        sub_account_id: activeSubAccountId,
        name: `${(src as any).name} (copy)`,
        type: (src as any).type,
        framework_id: (src as any).framework_id,
        context_type: (src as any).context_type,
        context_offer_id: (src as any).context_offer_id,
        context_custom_text: (src as any).context_custom_text,
        global_instructions: (src as any).global_instructions,
        funnel_id: (src as any).funnel_id,
        funnel_node_id: (src as any).funnel_node_id,
        status: "draft",
      } as any)
      .select("id, name, type, status, framework_id, updated_at")
      .single();
    if (insErr || !newDoc) { toast.error("Duplicate failed"); return; }
    const { data: comps } = await supabase
      .from("copy_document_components")
      .select("component_slug, sort_order, inputs, outputs, is_generated")
      .eq("document_id", id);
    if (comps && comps.length > 0) {
      const rows = comps.map((c: any) => ({
        document_id: (newDoc as any).id,
        component_slug: c.component_slug,
        sort_order: c.sort_order,
        inputs: c.inputs || {},
        outputs: c.outputs || {},
        is_generated: c.is_generated || false,
      }));
      await supabase.from("copy_document_components").insert(rows as any);
    }
    setDocuments((prev) => [newDoc as unknown as CopyDocument, ...prev]);
    toast.success("Document duplicated");
  };

  const filtered = documents.filter((d) => d.type === activeType);

  if (selectedDoc) {
    return (
      <CopyDocumentEditor
        documentId={selectedDoc.id}
        documentName={selectedDoc.name}
        documentType={selectedDoc.type}
        onBack={() => { setSelectedDoc(null); load(); }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Copy Documents</h1>
        <Button onClick={openPicker} size="sm" disabled={creating}>
          <Plus className="w-4 h-4 mr-1" /> New Document
        </Button>
      </div>

      <Tabs value={activeType} onValueChange={setActiveType} className="flex-1 flex flex-col">
        <TabsList className="mb-4 w-fit">
          {DOCUMENT_TYPES.map((dt) => (
            <TabsTrigger key={dt.type} value={dt.type} className="gap-2">
              <dt.icon className="w-4 h-4" />
              {dt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOCUMENT_TYPES.map((dt) => (
          <TabsContent key={dt.type} value={dt.type} className="flex-1">
            {filtered.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <dt.icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-display font-bold text-foreground mb-2">No documents yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first {dt.label.toLowerCase()} document.
                </p>
                <Button onClick={openPicker} size="sm" disabled={creating}>
                  <Plus className="w-4 h-4 mr-1" /> New Document
                </Button>
              </div>
            ) : (
              <LinkedDocumentsGrid
                documents={filtered}
                frameworkByType={frameworkByType}
                thumbnails={thumbnails}
                onOpen={(id) => {
                  const doc = filtered.find((d) => d.id === id);
                  if (doc) setSelectedDoc(doc);
                }}
                onDelete={deleteDocument}
                onDuplicate={duplicateDocument}
                gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Framework picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>Choose a framework to base this document on.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-medium">Framework</Label>
            <Select value={pickerFrameworkId} onValueChange={setPickerFrameworkId}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select framework..." /></SelectTrigger>
              <SelectContent>
                {frameworksForActiveType.map((fw) => (
                  <SelectItem key={fw.id} value={fw.id} className="text-sm">
                    {fw.name}
                  </SelectItem>
                ))}
                {genericFramework && activeType !== GENERIC_TYPE &&
                  !frameworksForActiveType.some((f) => f.id === genericFramework.id) && (
                  <SelectItem value={genericFramework.id} className="text-sm">
                    Generic (blank)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button onClick={() => createDocument(pickerFrameworkId, activeType)} disabled={!pickerFrameworkId || creating}>
              {creating ? "Creating..." : "Create Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CopyDocumentsModule;
