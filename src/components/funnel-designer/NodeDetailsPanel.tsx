import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AssetSectionsList from "../assets/AssetSectionsList";

interface Asset {
  id: string;
  name: string;
  type: string;
}

interface NodeDetailsPanelProps {
  nodeId: string;
  nodeLabel: string;
  customLabel?: string;
  linkedAssetId: string | null;
  noteContent?: string;
  renderStyle?: "page" | "icon" | "note" | "text";
  onLinkAsset: (assetId: string | null) => void;
  onRename: (name: string) => void;
  onNoteContentChange?: (content: string) => void;
  onClose: () => void;
}

const NodeDetailsPanel = ({ nodeId, nodeLabel, customLabel, linkedAssetId, noteContent, renderStyle, onLinkAsset, onRename, onNoteContentChange, onClose }: NodeDetailsPanelProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(linkedAssetId || "");

  const loadAssets = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("assets")
      .select("id, name, type")
      .eq("user_id", userId)
      .eq("type", "sales_copy")
      .order("name");
    if (data) setAssets(data as Asset[]);
  }, [userId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleLink = () => {
    onLinkAsset(selectedAssetId || null);
  };

  const handleUnlink = () => {
    setSelectedAssetId("");
    onLinkAsset(null);
  };

  const isNoteOrText = renderStyle === "note" || renderStyle === "text";

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-display font-bold text-foreground truncate">{customLabel || nodeLabel}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Note/Text content editor */}
      {isNoteOrText && (
        <div className="p-4 border-b border-border space-y-3">
          <label className="text-xs font-medium text-muted-foreground">
            {renderStyle === "note" ? t("funnelDesigner.noteContent") : t("funnelDesigner.textContent")}
          </label>
          <Textarea
            autoFocus
            value={noteContent || ""}
            onChange={(e) => onNoteContentChange?.(e.target.value)}
            placeholder={renderStyle === "note" ? t("funnelDesigner.notePlaceholder") : t("funnelDesigner.textPlaceholder")}
            className="text-sm min-h-[100px] resize-y"
          />
        </div>
      )}

      {/* Custom name - for non-note/text elements */}
      {!isNoteOrText && (
        <div className="p-4 border-b border-border space-y-3">
          <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.customName")}</label>
          <Input
            value={customLabel || ""}
            onChange={(e) => onRename(e.target.value)}
            placeholder={nodeLabel}
            className="text-sm h-8"
          />
        </div>
      )}

      {/* Asset linking - only for non-note/text elements */}
      {!isNoteOrText && (
        <div className="p-4 border-b border-border space-y-3">
          <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.linkAsset")}</label>
          <div className="flex gap-2">
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder={t("funnelDesigner.selectAsset")} />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAssetId && selectedAssetId !== linkedAssetId && (
              <Button size="sm" className="h-8 px-2" onClick={handleLink}>
                <Link2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {linkedAssetId && (
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleUnlink}>
                <Unlink className="w-3.5 h-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      )}

      {!isNoteOrText && (
        <div className="flex-1 overflow-auto p-4">
          {linkedAssetId ? (
            <AssetSectionsList assetId={linkedAssetId} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">{t("funnelDesigner.noAssetLinked")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NodeDetailsPanel;
