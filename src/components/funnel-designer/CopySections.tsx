import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CopySection {
  id: string;
  title: string;
  description: string;
}

interface CopySectionsProps {
  linkedAssetId: string | null;
  /** Local sections stored in node data when no asset is linked */
  localSections: CopySection[];
  onLocalSectionsChange: (sections: CopySection[]) => void;
  onLinkAsset: (assetId: string) => void;
}

const CopySections = ({ linkedAssetId, localSections, onLocalSectionsChange, onLinkAsset }: CopySectionsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [assetSections, setAssetSections] = useState<CopySection[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  // Load sections from linked asset
  useEffect(() => {
    if (!linkedAssetId) {
      setAssetSections([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("asset_sections")
        .select("id, title, description")
        .eq("asset_id", linkedAssetId)
        .order("sort_order", { ascending: true });
      if (data) setAssetSections(data as CopySection[]);
    })();
  }, [linkedAssetId]);

  const sections = linkedAssetId ? assetSections : localSections;

  const addSection = () => {
    const newSection: CopySection = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
    };
    onLocalSectionsChange([...localSections, newSection]);
    setExpandedId(newSection.id);
  };

  const updateLocalSection = (id: string, updates: Partial<CopySection>) => {
    onLocalSectionsChange(
      localSections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteLocalSection = (id: string) => {
    onLocalSectionsChange(localSections.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const convertToAsset = async () => {
    if (!user || localSections.length === 0) return;
    setConverting(true);
    try {
      const { data: asset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          type: "sales_copy",
          name: "Sales Copy",
          project_id: activeProject?.id || null,
        })
        .select("id")
        .single();

      if (assetErr || !asset) throw assetErr;

      const rows = localSections.map((s, i) => ({
        asset_id: asset.id,
        title: s.title || t("assets.newSection"),
        description: s.description || "",
        content: "",
        sort_order: i,
      }));

      await supabase.from("asset_sections").insert(rows);
      onLinkAsset(asset.id);
      toast.success(t("funnelDesigner.convertedToAsset"));
    } catch {
      toast.error(t("funnelDesigner.convertError"));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.copySections")}</label>

      {sections.map((section) => (
        <div key={section.id} className="border border-border rounded-lg bg-card">
          <div className="flex items-center gap-2 p-2">
            {!linkedAssetId && (
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <button
              onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
              className="shrink-0"
            >
              {expandedId === section.id ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            {linkedAssetId ? (
              <span className="text-xs font-medium truncate flex-1">{section.title}</span>
            ) : (
              <Input
                value={section.title}
                onChange={(e) => updateLocalSection(section.id, { title: e.target.value })}
                className="border-0 bg-transparent p-0 h-auto text-xs font-medium focus-visible:ring-0 flex-1"
                placeholder={t("funnelDesigner.copySectionTitle")}
              />
            )}
            {!linkedAssetId && (
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteLocalSection(section.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            )}
          </div>
          {expandedId === section.id && (
            <div className="px-2 pb-2">
              {linkedAssetId ? (
                <p className="text-xs text-muted-foreground">{section.description || "—"}</p>
              ) : (
                <textarea
                  value={section.description}
                  onChange={(e) => updateLocalSection(section.id, { description: e.target.value })}
                  placeholder={t("funnelDesigner.copySectionDescription")}
                  className="w-full text-xs text-muted-foreground bg-transparent border border-border rounded-md px-2 py-1.5 resize-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={1}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {!linkedAssetId && (
        <>
          <Button variant="outline" size="sm" onClick={addSection} className="w-full text-xs h-7">
            <Plus className="w-3.5 h-3.5 mr-1" /> {t("funnelDesigner.addCopySection")}
          </Button>
          {localSections.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={convertToAsset}
              disabled={converting}
              className="w-full text-xs h-7"
            >
              <FileDown className="w-3.5 h-3.5 mr-1" /> {t("funnelDesigner.convertToAsset")}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default CopySections;
