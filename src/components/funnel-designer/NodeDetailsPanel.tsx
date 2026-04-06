import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { X, Link2, Unlink, Upload, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CopySections from "./CopySections";

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
  pageType?: string;
  nodeNotes?: string;
  nodeUrl?: string;
  nodeImage?: string;
  waitType?: "days" | "hours" | "minutes";
  waitDuration?: number;
  copySections?: Array<{ id: string; title: string; description: string }>;
  funnelName?: string;
  readOnly?: boolean;
  onLinkAsset: (assetId: string | null) => void;
  onRename: (name: string) => void;
  onNoteContentChange?: (content: string) => void;
  onDataChange?: (key: string, value: any) => void;
  onClose: () => void;
}

const NodeDetailsPanel = ({
  nodeId, nodeLabel, customLabel, linkedAssetId, noteContent, renderStyle, pageType,
  nodeNotes, nodeUrl, nodeImage, waitType, waitDuration, copySections, funnelName,
  readOnly, onLinkAsset, onRename, onNoteContentChange, onDataChange, onClose,
}: NodeDetailsPanelProps) => {
  const { t } = useTranslation();
  // userId is only needed for non-readOnly mode
  const [userId, setUserId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(linkedAssetId || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user id only when not read-only
  useEffect(() => {
    if (readOnly) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, [readOnly]);

  // Sync selectedAssetId when linkedAssetId changes (e.g. after convert)
  useEffect(() => {
    setSelectedAssetId(linkedAssetId || "");
  }, [linkedAssetId]);

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

  const handleLink = () => { onLinkAsset(selectedAssetId || null); };
  const handleUnlink = () => { setSelectedAssetId(""); onLinkAsset(null); };

  const isNoteOrText = renderStyle === "note" || renderStyle === "text";
  const isWait = pageType === "wait";
  const isPageOrEmail = !isNoteOrText && !isWait;

  const resizeImage = (file: File, maxWidth: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
      };
      img.src = url;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ts = Date.now();
    const ext = file.name.split('.').pop();

    // Upload full-size image
    const fullPath = `${userId}/${nodeId}_${ts}.${ext}`;
    const { error } = await supabase.storage.from("funnel-screenshots").upload(fullPath, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("funnel-screenshots").getPublicUrl(fullPath);
      onDataChange?.("nodeImage", urlData.publicUrl);

      // Generate and upload thumbnail (400px wide)
      try {
        const thumbBlob = await resizeImage(file, 400);
        const thumbPath = `${userId}/${nodeId}_${ts}_thumb.webp`;
        const { error: thumbErr } = await supabase.storage.from("funnel-screenshots").upload(thumbPath, thumbBlob, { contentType: "image/webp" });
        if (!thumbErr) {
          const { data: thumbUrl } = supabase.storage.from("funnel-screenshots").getPublicUrl(thumbPath);
          onDataChange?.("nodeImageThumb", thumbUrl.publicUrl);
        }
      } catch { /* thumbnail generation failed, full image will be used */ }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = () => { onDataChange?.("nodeImage", ""); };

  const waitDurationLabel = waitType === "days" ? t("funnelDesigner.waitDays")
    : waitType === "hours" ? t("funnelDesigner.waitHours")
    : t("funnelDesigner.waitMinutes");

  const pageName = customLabel || nodeLabel;
  const defaultAssetName = `${funnelName || "Funnel"} ${pageName} Copy`;

  // Read-only: render a clean, text-based panel
  if (readOnly) {
    const displayName = customLabel || nodeLabel;
    const hasNotes = isNoteOrText && !!noteContent;
    const hasNodeNotes = isPageOrEmail && !!nodeNotes;
    const hasUrl = isPageOrEmail && !!nodeUrl;
    const hasImage = isPageOrEmail && !!nodeImage;
    const hasCopySections = copySections && copySections.length > 0;

    return (
      <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-display font-bold text-foreground truncate">{displayName}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {/* Note/Text content */}
          {hasNotes && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {renderStyle === "note" ? t("funnelDesigner.noteContent") : t("funnelDesigner.textContent")}
              </label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{noteContent}</p>
            </div>
          )}

          {/* Notes */}
          {hasNodeNotes && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("funnelDesigner.nodeNotes")}</label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{nodeNotes}</p>
            </div>
          )}

          {/* Copy sections */}
          {hasCopySections && (
            <div className="p-4 border-b border-border space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.copySections")}</label>
              {copySections!.map((s, i) => (
                <div key={i} className="text-xs text-foreground border border-border rounded p-2">
                  <p className="font-medium">{s.title}</p>
                  {s.description && <p className="text-muted-foreground mt-0.5">{s.description}</p>}
                </div>
              ))}
            </div>
          )}

          {/* URL */}
          {hasUrl && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("funnelDesigner.nodeUrl")}</label>
              <a href={nodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                {nodeUrl} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Image */}
          {hasImage && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("funnelDesigner.nodeImage")}</label>
              <img src={nodeImage} alt="Screenshot" className="w-full rounded border border-border" />
              <Button variant="outline" size="sm" className="h-7 text-xs mt-2 w-full" asChild>
                <a href={nodeImage} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" /> {t("funnelDesigner.viewImage")}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit mode (existing)
  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-display font-bold text-foreground truncate">{customLabel || nodeLabel}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
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

        {/* Wait element config */}
        {isWait && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.waitType")}</label>
            <Select value={waitType || "days"} onValueChange={(v) => onDataChange?.("waitType", v)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">{t("funnelDesigner.waitDays")}</SelectItem>
                <SelectItem value="hours">{t("funnelDesigner.waitHours")}</SelectItem>
                <SelectItem value="minutes">{t("funnelDesigner.waitMinutes")}</SelectItem>
              </SelectContent>
            </Select>
            <label className="text-xs font-medium text-muted-foreground">{waitDurationLabel}</label>
            <Input
              type="number"
              min={1}
              value={waitDuration ?? ""}
              onChange={(e) => onDataChange?.("waitDuration", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="1"
              className="text-sm h-8"
            />
          </div>
        )}

        {/* 1. Custom name */}
        {isPageOrEmail && (
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

        {/* 2. Notes field */}
        {isPageOrEmail && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.nodeNotes")}</label>
            <Textarea
              value={nodeNotes || ""}
              onChange={(e) => onDataChange?.("nodeNotes", e.target.value)}
              placeholder={t("funnelDesigner.nodeNotesPlaceholder")}
              className="text-sm min-h-[80px] resize-y"
            />
          </div>
        )}

        {/* 3. Copy sections */}
        {(renderStyle === "page" || pageType === "email") && (
          <div className="p-4 border-b border-border">
            <CopySections
              linkedAssetId={linkedAssetId}
              localSections={copySections || []}
              onLocalSectionsChange={(sections) => onDataChange?.("copySections", sections)}
              onLinkAsset={(assetId) => {
                onLinkAsset(assetId);
                loadAssets();
              }}
              defaultAssetName={defaultAssetName}
            />
          </div>
        )}

        {/* 4. Link Sales Copy asset */}
        {isPageOrEmail && renderStyle === "page" && (
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

        {/* 5. URL field */}
        {isPageOrEmail && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.nodeUrl")}</label>
            <div className="flex gap-2">
              <Input
                value={nodeUrl || ""}
                onChange={(e) => onDataChange?.("nodeUrl", e.target.value)}
                placeholder={t("funnelDesigner.nodeUrlPlaceholder")}
                className="text-sm h-8 flex-1"
              />
              {nodeUrl && (
                <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                  <a href={nodeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 6. Image / screenshot */}
        {isPageOrEmail && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.nodeImage")}</label>
            {nodeImage ? (
              <div className="space-y-2">
                <img src={nodeImage} alt="Screenshot" className="w-full rounded border border-border" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" asChild>
                    <a href={nodeImage} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" /> {t("funnelDesigner.viewImage")}
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRemoveImage}>
                    <Trash2 className="w-3 h-3 mr-1 text-destructive" /> {t("funnelDesigner.removeImage")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {uploading ? t("funnelDesigner.uploading") : t("funnelDesigner.uploadImage")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailsPanel;
