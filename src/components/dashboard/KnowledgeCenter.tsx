import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KnowledgeDocument {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const KnowledgeCenter = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const filePath = `${crypto.randomUUID()}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("knowledge-documents")
      .upload(filePath, file);

    if (uploadError) {
      toast.error(t("knowledge.uploadError"));
      setUploading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from("knowledge_documents")
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      })
      .select()
      .single();

    if (dbError) {
      toast.error(t("knowledge.saveError"));
      setUploading(false);
      return;
    }

    setDocuments((prev) => [data, ...prev]);
    toast.success(t("knowledge.uploaded"));
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteDocument = async (doc: KnowledgeDocument) => {
    // Delete file from storage
    await supabase.storage.from("knowledge-documents").remove([doc.file_path]);

    const { error } = await supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast.error(t("knowledge.deleteError"));
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success(t("knowledge.deleted"));
  };

  const downloadDocument = async (doc: KnowledgeDocument) => {
    const { data, error } = await supabase.storage
      .from("knowledge-documents")
      .download(doc.file_path);

    if (error || !data) {
      toast.error(t("knowledge.downloadError"));
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
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
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="gap-2"
            disabled={uploading}
          >
            <Upload className="w-4 h-4" />
            {uploading ? t("knowledge.uploading") : t("knowledge.upload")}
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t("knowledge.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.file_name} · {formatFileSize(doc.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadDocument(doc)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(doc)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeCenter;
