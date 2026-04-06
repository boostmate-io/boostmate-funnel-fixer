import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "./RichTextEditor";

interface Section {
  id: string;
  asset_id: string;
  title: string;
  description: string;
  content: string;
  sort_order: number;
}

interface AssetSectionsListProps {
  assetId: string;
}

const AssetSectionsList = ({ assetId }: AssetSectionsListProps) => {
  const { t } = useTranslation();
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const loadSections = useCallback(async () => {
    const { data } = await supabase
      .from("asset_sections")
      .select("*")
      .eq("asset_id", assetId)
      .order("sort_order", { ascending: true });
    if (data) setSections(data as Section[]);
  }, [assetId]);

  useEffect(() => { loadSections(); }, [loadSections]);

  const addSection = async () => {
    const { data, error } = await supabase
      .from("asset_sections")
      .insert({ asset_id: assetId, title: t("assets.newSection"), sort_order: sections.length })
      .select()
      .single();
    if (error) toast.error(t("assets.saveError"));
    else {
      setSections((prev) => [...prev, data as Section]);
      setExpandedId((data as Section).id);
    }
  };

  const updateSection = useCallback(async (id: string, updates: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(async () => {
      await supabase.from("asset_sections").update(updates).eq("id", id);
    }, 800);
    setSaveTimeout(timeout);
  }, [saveTimeout]);

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("asset_sections").delete().eq("id", id);
    if (error) toast.error(t("assets.deleteError"));
    else {
      setSections((prev) => prev.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const updated = [...sections];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(idx, 0, moved);
    setSections(updated);
    setDraggedIdx(idx);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    const updates = sections.map((s, i) => supabase.from("asset_sections").update({ sort_order: i }).eq("id", s.id));
    await Promise.all(updates);
  };

  return (
    <div className="space-y-2">
      {sections.map((section, idx) => (
        <div
          key={section.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          className={`border border-border rounded-lg bg-card transition-colors ${draggedIdx === idx ? "opacity-50" : ""}`}
        >
          <div className="flex items-center gap-2 p-3">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
            <button
              onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
              className="shrink-0"
            >
              {expandedId === section.id ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <Input
              value={section.title}
              onChange={(e) => updateSection(section.id, { title: e.target.value })}
              className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
              placeholder={t("assets.sectionTitle")}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteSection(section.id)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
          {expandedId === section.id && (
            <div className="px-3 pb-3">
              <RichTextEditor
                content={section.content}
                onChange={(content) => updateSection(section.id, { content })}
                placeholder={t("assets.sectionContentPlaceholder")}
              />
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addSection} className="w-full">
        <Plus className="w-4 h-4 mr-1" /> {t("assets.addSection")}
      </Button>
    </div>
  );
};

export default AssetSectionsList;
