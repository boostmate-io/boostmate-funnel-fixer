import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, FileText, Mail, Video, Megaphone, Settings2, Eye, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopyDocumentEditor from "./CopyDocumentEditor";

interface CopyDocument {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  { type: "sales_copy", icon: FileText, label: "Sales Copy" },
  { type: "email_sequence", icon: Mail, label: "Email Sequences" },
  { type: "vsl_script", icon: Video, label: "VSL Scripts" },
  { type: "ad_creative", icon: Megaphone, label: "Ad Creatives" },
];

const CopyDocumentsModule = () => {
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CopyDocument[]>([]);
  const [activeType, setActiveType] = useState("sales_copy");
  const [selectedDoc, setSelectedDoc] = useState<CopyDocument | null>(null);

  const load = useCallback(async () => {
    if (!user || !activeSubAccountId) return;
    const { data } = await supabase
      .from("copy_documents")
      .select("id, name, type, created_at, updated_at")
      .eq("sub_account_id", activeSubAccountId)
      .order("updated_at", { ascending: false });
    if (data) setDocuments(data as CopyDocument[]);
  }, [user, activeSubAccountId]);

  useEffect(() => { load(); }, [load]);

  const createDocument = async () => {
    if (!user || !activeSubAccountId) return;
    const { data, error } = await supabase
      .from("copy_documents")
      .insert({
        user_id: user.id,
        sub_account_id: activeSubAccountId,
        name: "Untitled Document",
        type: activeType,
      })
      .select("id, name, type, created_at, updated_at")
      .single();
    if (error) toast.error("Create failed");
    else if (data) {
      setDocuments(prev => [data as CopyDocument, ...prev]);
      setSelectedDoc(data as CopyDocument);
    }
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from("copy_documents").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
      toast.success("Document deleted");
    }
  };

  const filtered = documents.filter(d => d.type === activeType);

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
        <Button onClick={createDocument} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Document
        </Button>
      </div>

      <Tabs value={activeType} onValueChange={setActiveType} className="flex-1 flex flex-col">
        <TabsList className="mb-4 w-fit">
          {DOCUMENT_TYPES.map(dt => (
            <TabsTrigger key={dt.type} value={dt.type} className="gap-2">
              <dt.icon className="w-4 h-4" />
              {dt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOCUMENT_TYPES.map(dt => (
          <TabsContent key={dt.type} value={dt.type} className="flex-1">
            {filtered.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <dt.icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-display font-bold text-foreground mb-2">No documents yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first {dt.label.toLowerCase()} document.</p>
                <Button onClick={createDocument} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> New Document
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:shadow-card-hover transition-shadow cursor-pointer"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.updated_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CopyDocumentsModule;
