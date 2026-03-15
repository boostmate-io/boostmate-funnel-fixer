import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const KnowledgeCenter = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) fetchDocuments();
  }, [isAdmin]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
    setLoading(false);
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setDocuments(data || []);
  };

  const createDocument = async () => {
    const { data, error } = await supabase
      .from("knowledge_documents")
      .insert({ title: t("knowledge.untitled"), content: "" })
      .select()
      .single();
    if (error) {
      toast.error(t("knowledge.saveError"));
      return;
    }
    setDocuments((prev) => [data, ...prev]);
    setSelectedDoc(data);
    toast.success(t("knowledge.created"));
  };

  const saveDocument = async () => {
    if (!selectedDoc) return;
    const { error } = await supabase
      .from("knowledge_documents")
      .update({ title: selectedDoc.title, content: selectedDoc.content })
      .eq("id", selectedDoc.id);
    if (error) {
      toast.error(t("knowledge.saveError"));
      return;
    }
    setDocuments((prev) =>
      prev.map((d) => (d.id === selectedDoc.id ? { ...d, ...selectedDoc } : d))
    );
    toast.success(t("knowledge.saved"));
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(t("knowledge.deleteError"));
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
    toast.success(t("knowledge.deleted"));
  };

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-foreground">{t("knowledge.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("knowledge.description")}</p>
        </div>
        <Button onClick={createDocument} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {t("knowledge.new")}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Document list */}
        <div className="space-y-2 md:col-span-1 border-r border-border pr-4">
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">{t("knowledge.empty")}</p>
          )}
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                selectedDoc?.id === doc.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{doc.title}</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDocument(doc.id);
                }}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="md:col-span-2">
          {selectedDoc ? (
            <div className="space-y-4">
              <Input
                value={selectedDoc.title}
                onChange={(e) =>
                  setSelectedDoc({ ...selectedDoc, title: e.target.value })
                }
                className="font-medium"
                placeholder={t("knowledge.titlePlaceholder")}
              />
              <Textarea
                value={selectedDoc.content}
                onChange={(e) =>
                  setSelectedDoc({ ...selectedDoc, content: e.target.value })
                }
                placeholder={t("knowledge.contentPlaceholder")}
                className="min-h-[300px] font-mono text-sm"
              />
              <Button onClick={saveDocument} size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                {t("knowledge.save")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
              {t("knowledge.selectDocument")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeCenter;
