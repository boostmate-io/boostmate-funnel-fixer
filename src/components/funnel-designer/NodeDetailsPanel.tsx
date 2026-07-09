import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { X, Upload, ExternalLink, Trash2, Bold, Italic, Underline, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import NodeLinkedDocuments from "@/components/copy/linked/NodeLinkedDocuments";
import type { SupabaseClient } from "@supabase/supabase-js";

interface CopyFramework {
  id: string;
  name: string;
  type: string;
  component_slugs: string[] | any;
}

interface CopyComponentDef {
  slug: string;
  name: string;
  icon: string | null;
}


const COLOR_PALETTE = [
  "#1a1a1a", "#9CA3AF", "#22C55E", "#3B82F6", "#EF4444", "#FACC15", "#A855F7", "#F97316",
];

const THEME_COLOR_PALETTE = [
  "#FFFFFF", "#E5E7EB", "#22C55E", "#3B82F6", "#EF4444", "#FACC15", "#A855F7", "#F97316",
  "#1a1a1a", "#6B7280", "#F59E0B", "#EC4899",
];

const isColorDark = (hex: string): boolean => {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
};

interface NodeDetailsPanelProps {
  nodeId: string;
  nodeLabel: string;
  customLabel?: string;
  noteContent?: string;
  renderStyle?: "page" | "icon" | "note" | "text" | "shape";
  pageType?: string;
  nodeNotes?: string;
  nodeUrl?: string;
  nodeImage?: string;
  waitType?: "days" | "hours" | "minutes";
  waitDuration?: number;
  copyComponentNames?: string[];
  funnelName?: string;
  funnelId?: string | null;
  linkedOfferId?: string | null;
  copyFrameworkId?: string | null;
  readOnly?: boolean;
  emailSubject?: string;
  /** Alternative Supabase client (used on shared / read-only pages). */
  supabaseClient?: SupabaseClient<any, any, any>;
  // Text styling
  textSize?: number;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textColor?: string;
  // Notes theme
  themeColor?: string;
  // Shape props
  shapeType?: "circle" | "square" | "triangle";
  shapeBorderStyle?: "solid" | "dashed" | "dotted";
  shapeTransparent?: boolean;
  shapeWidth?: number;
  shapeHeight?: number;
  shapeColor?: string;
  onRename: (name: string) => void;
  onNoteContentChange?: (content: string) => void;
  onDataChange?: (key: string, value: any) => void;
  onNodeDataChange?: (nodeId: string, key: string, value: any) => void;
  onOpenCopyDocument?: (documentId: string) => void;
  onClose: () => void;
}

const NodeDetailsPanel = ({
  nodeId, nodeLabel, customLabel, noteContent, renderStyle, pageType,
  nodeNotes, nodeUrl, nodeImage, waitType, waitDuration, copyComponentNames, funnelName,
  funnelId, linkedOfferId, copyFrameworkId,
  readOnly, textSize, textBold, textItalic, textUnderline, textColor, themeColor,
  shapeType, shapeBorderStyle, shapeTransparent, shapeWidth, shapeHeight, shapeColor,
  emailSubject, supabaseClient,
  onRename, onNoteContentChange, onDataChange, onNodeDataChange, onOpenCopyDocument, onClose,
}: NodeDetailsPanelProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const userId = user?.id ?? null;
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [frameworks, setFrameworks] = useState<CopyFramework[]>([]);
  const [componentDefs, setComponentDefs] = useState<CopyComponentDef[]>([]);

  // Determine framework type from node context
  const frameworkType = pageType === "email" ? "email_sequence" : "sales_copy";

  const loadFrameworks = useCallback(async () => {
    const [{ data: fw }, { data: cd }] = await Promise.all([
      supabase.from("copy_frameworks").select("id, name, type, component_slugs").eq("is_active", true).eq("type", frameworkType).order("name"),
      supabase.from("copy_components").select("slug, name, icon").eq("is_active", true),
    ]);
    if (fw) setFrameworks(fw as any);
    if (cd) setComponentDefs(cd as any);
  }, [frameworkType]);

  useEffect(() => { loadFrameworks(); }, [loadFrameworks]);

  const setNodeData = (key: string, value: any) => {
    if (onNodeDataChange) onNodeDataChange(nodeId, key, value);
    else onDataChange?.(key, value);
  };

  const activeFramework = frameworks.find((f) => f.id === copyFrameworkId);
  const activeSlugs: string[] = Array.isArray(activeFramework?.component_slugs)
    ? (activeFramework?.component_slugs as string[])
    : ((activeFramework?.component_slugs as any)?.slugs || []);



  const isNote = renderStyle === "note";
  const isText = renderStyle === "text";
  const isNoteOrText = isNote || isText;
  const isWait = pageType === "wait";
  const isShape = renderStyle === "shape";
  const isPageOrEmail = !isNoteOrText && !isWait && !isShape;

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
    const targetNodeId = nodeId; // capture to avoid race when user switches selection
    const update = (key: string, value: any) => {
      if (onNodeDataChange) onNodeDataChange(targetNodeId, key, value);
      else onDataChange?.(key, value);
    };
    setUploading(true);
    const ts = Date.now();
    const ext = file.name.split('.').pop();
    const fullPath = `${userId}/${targetNodeId}_${ts}.${ext}`;
    const { error } = await supabase.storage.from("funnel-screenshots").upload(fullPath, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("funnel-screenshots").getPublicUrl(fullPath);
      update("nodeImage", urlData.publicUrl);
      try {
        const thumbBlob = await resizeImage(file, 400);
        const thumbPath = `${userId}/${targetNodeId}_${ts}_thumb.webp`;
        const { error: thumbErr } = await supabase.storage.from("funnel-screenshots").upload(thumbPath, thumbBlob, { contentType: "image/webp" });
        if (!thumbErr) {
          const { data: thumbUrl } = supabase.storage.from("funnel-screenshots").getPublicUrl(thumbPath);
          update("nodeImageThumb", thumbUrl.publicUrl);
        }
      } catch { /* thumbnail generation failed */ }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = () => {
    if (onNodeDataChange) {
      onNodeDataChange(nodeId, "nodeImage", "");
      onNodeDataChange(nodeId, "nodeImageThumb", "");
    } else {
      onDataChange?.("nodeImage", "");
      onDataChange?.("nodeImageThumb", "");
    }
  };

  const waitDurationLabel = waitType === "days" ? t("funnelDesigner.waitDays")
    : waitType === "hours" ? t("funnelDesigner.waitHours")
    : t("funnelDesigner.waitMinutes");

  const pageName = customLabel || nodeLabel;
  const defaultAssetName = `${funnelName || "Funnel"} ${pageName} Copy`;

  // Read-only mode
  if (readOnly) {
    const displayName = customLabel || nodeLabel;
    const hasNotes = isNoteOrText && !!noteContent;
    const hasNodeNotes = !isNoteOrText && !isShape && !!nodeNotes;
    const hasUrl = !isNoteOrText && !isShape && !!nodeUrl;
    const hasImage = !isNoteOrText && !isShape && !!nodeImage;
    const hasCopyComponents = copyComponentNames && copyComponentNames.length > 0;
    const hasAnyDetails = hasNotes || hasNodeNotes || hasUrl || hasImage || hasCopyComponents || (pageType === "email" && !!emailSubject);

    return (
      <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-display font-bold text-foreground truncate">{displayName}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {isPageOrEmail && pageType === "email" && !!emailSubject && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject line</label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{emailSubject}</p>
            </div>
          )}
          {hasNotes && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {isNote ? t("funnelDesigner.noteContent") : t("funnelDesigner.textContent")}
              </label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{noteContent}</p>
            </div>
          )}
          {hasNodeNotes && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("funnelDesigner.nodeNotes")}</label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{nodeNotes}</p>
            </div>
          )}
          {hasCopyComponents && (
            <div className="p-4 border-b border-border space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.copyFramework.componentsLabel")}</label>
              {copyComponentNames!.map((name, i) => (
                <div key={i} className="text-xs text-foreground border border-border rounded px-2 py-1">
                  {name}
                </div>
              ))}
            </div>
          )}
          {hasUrl && (
            <div className="p-4 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("funnelDesigner.nodeUrl")}</label>
              <a href={nodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                {nodeUrl} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
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
          {!hasAnyDetails && (
            <div className="p-4 text-sm text-muted-foreground">
              No additional details.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-display font-bold text-foreground truncate">{customLabel || nodeLabel}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* ── Shape options ── */}
        {isShape && (
          <div className="p-4 border-b border-border space-y-4">
            {/* Shape type */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Select Shape</label>
              <div className="flex items-center gap-3">
                {(["circle", "square", "triangle"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onDataChange?.("shapeType", s)}
                    className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 transition-colors ${
                      (shapeType || "square") === s ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {s === "circle" && <div className="w-8 h-8 rounded-full border-2 border-muted-foreground" />}
                    {s === "square" && <div className="w-8 h-8 rounded-sm border-2 border-muted-foreground" />}
                    {s === "triangle" && (
                      <svg width="32" height="32" viewBox="0 0 32 32">
                        <polygon points="16,4 28,28 4,28" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape color */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Shape Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => onDataChange?.("color", c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      (shapeColor || "#9CA3AF") === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Border style */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Border Style</label>
              <Select value={shapeBorderStyle || "solid"} onValueChange={(v) => onDataChange?.("shapeBorderStyle", v)}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transparent background */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="shape-transparent"
                checked={shapeTransparent ?? false}
                onCheckedChange={(checked) => onDataChange?.("shapeTransparent", !!checked)}
              />
              <label htmlFor="shape-transparent" className="text-xs font-medium text-muted-foreground cursor-pointer">
                Transparent background
              </label>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Width</label>
              <Slider
                value={[shapeWidth || 120]}
                min={60}
                max={400}
                step={10}
                onValueChange={([v]) => onDataChange?.("shapeWidth", v)}
              />
              <label className="text-xs font-medium text-muted-foreground">Height</label>
              <Slider
                value={[shapeHeight || 120]}
                min={60}
                max={400}
                step={10}
                onValueChange={([v]) => onDataChange?.("shapeHeight", v)}
              />
              <p className="text-[10px] text-muted-foreground">{shapeWidth || 120} × {shapeHeight || 120}</p>
            </div>
          </div>
        )}

        {/* ── Note content editor + theme color ── */}
        {isNote && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.noteContent")}</label>
            <Textarea
              autoFocus
              value={noteContent || ""}
              onChange={(e) => onNoteContentChange?.(e.target.value)}
              placeholder={t("funnelDesigner.notePlaceholder")}
              className="text-sm min-h-[120px] resize-y"
            />
            <label className="text-xs font-medium text-muted-foreground">Theme Color</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {THEME_COLOR_PALETTE.map((c) => {
                const selected = (themeColor || "#F59E0B") === c;
                return (
                  <button
                    key={c}
                    onClick={() => onDataChange?.("themeColor", c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      selected ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Text content editor + styling ── */}
        {isText && (
          <div className="p-4 border-b border-border space-y-3">
            {/* Styling toolbar */}
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center border border-border rounded-md overflow-hidden">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => onDataChange?.("textSize", Math.max(8, (textSize || 12) - 1))}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-xs font-mono w-7 text-center">{textSize || 12}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => onDataChange?.("textSize", Math.min(48, (textSize || 12) + 1))}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <Toggle size="sm" pressed={textBold ?? false} onPressedChange={(v) => onDataChange?.("textBold", v)} className="h-7 w-7 p-0">
                <Bold className="w-3.5 h-3.5" />
              </Toggle>
              <Toggle size="sm" pressed={textItalic ?? false} onPressedChange={(v) => onDataChange?.("textItalic", v)} className="h-7 w-7 p-0">
                <Italic className="w-3.5 h-3.5" />
              </Toggle>
              <Toggle size="sm" pressed={textUnderline ?? false} onPressedChange={(v) => onDataChange?.("textUnderline", v)} className="h-7 w-7 p-0">
                <Underline className="w-3.5 h-3.5" />
              </Toggle>
            </div>

            <Textarea
              autoFocus
              value={noteContent || ""}
              onChange={(e) => onNoteContentChange?.(e.target.value)}
              placeholder={t("funnelDesigner.textPlaceholder")}
              className="text-sm min-h-[60px] resize-y"
            />

            <label className="text-xs font-medium text-muted-foreground">Text Color</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PALETTE.map((c) => {
                const selected = (textColor || "#6B7280") === c;
                return (
                  <button
                    key={c}
                    onClick={() => onDataChange?.("textColor", c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      selected ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Wait element config */}
        {isWait && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground">{t("funnelDesigner.customName")}</label>
            <Input
              value={customLabel || ""}
              onChange={(e) => onRename(e.target.value)}
              placeholder={nodeLabel}
              className="text-sm h-8"
            />
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
            {pageType === "email" && (
              <>
                <label className="text-xs font-medium text-muted-foreground">Subject line</label>
                <Input
                  value={emailSubject || ""}
                  onChange={(e) => onDataChange?.("emailSubject", e.target.value)}
                  placeholder="Enter email subject..."
                  className="text-sm h-8"
                />
              </>
            )}
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

        {/* 3. Copy Framework */}
        {(renderStyle === "page" || pageType === "email") && (
          <div className="p-4 border-b border-border space-y-3">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {t("funnelDesigner.copyFramework.label")}
            </label>
            <Select
              value={copyFrameworkId || "__none"}
              onValueChange={(v) => setNodeData("copyFrameworkId", v === "__none" ? null : v)}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder={t("funnelDesigner.copyFramework.choose")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">{t("funnelDesigner.copyFramework.none")}</SelectItem>
                {frameworks.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFramework && activeSlugs.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("funnelDesigner.copyFramework.componentsPreview")}
                </p>
                <ul className="text-xs text-foreground space-y-0.5">
                  {activeSlugs.map((slug) => {
                    const def = componentDefs.find((c) => c.slug === slug);
                    return (
                      <li key={slug} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                        {def?.name || slug}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {copyDocumentId ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground bg-primary/5 border border-primary/20 rounded-md px-2 py-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate flex-1">{linkedDocName || t("funnelDesigner.copyFramework.documentLinked")}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs flex-1"
                    onClick={() => onOpenCopyDocument?.(copyDocumentId)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> {t("funnelDesigner.copyFramework.openDocument")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setNodeData("copyDocumentId", null)}
                    title={t("funnelDesigner.copyFramework.unlink")}
                  >
                    <Unlink className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : (
              copyFrameworkId && (
                <Button
                  size="sm"
                  className="h-8 text-xs w-full"
                  disabled={creatingDoc || !activeSubAccountId}
                  onClick={createCopyDocument}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {creatingDoc
                    ? t("funnelDesigner.copyFramework.creating")
                    : t("funnelDesigner.copyFramework.createDocument")}
                </Button>
              )
            )}
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
