import { memo, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { getWireframeForType } from "./WireframePreviews";

type FunnelNodeData = {
  label: string;
  customLabel?: string;
  pageType: string;
  icon: string;
  color: string;
  isDecision?: boolean;
  renderStyle?: "page" | "icon" | "note" | "text" | "shape";
  noteContent?: string;
  waitType?: "days" | "hours" | "minutes";
  waitDuration?: number;
  nodeImage?: string;
  nodeImageThumb?: string;
  nodeUrl?: string;
  showImages?: boolean;
  readOnly?: boolean;
  copySections?: Array<{ id?: string; title: string; description?: string }>;
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
};

/* helper to determine if a color is dark */
const isColorDark = (hex: string): boolean => {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

/* ── helper: build wait label ── */
const getWaitLabel = (data: FunnelNodeData, t: (k: string) => string): string => {
  if (data.waitDuration && data.waitType) {
    const n = data.waitDuration;
    const unitKey = n === 1
      ? `funnelDesigner.wait${data.waitType.charAt(0).toUpperCase() + data.waitType.slice(1, -1)}`
      : `funnelDesigner.wait${data.waitType.charAt(0).toUpperCase() + data.waitType.slice(1)}`;
    return `Wait ${n} ${t(unitKey)}`;
  }
  return t(data.label);
};

/* ── Email-style node (no circle, just a large icon) ── */
const EmailStyleRender = ({ nodeData, onDoubleClick }: { nodeData: FunnelNodeData; onDoubleClick?: () => void }) => {
  const { t } = useTranslation();
  const IconComponent = (Icons as any)[nodeData.icon] || Icons.FileText;
  const displayName = nodeData.customLabel || t(nodeData.label);

  return (
    <div className="flex flex-col items-center gap-1.5 w-[100px] relative overflow-visible" onDoubleClickCapture={onDoubleClick}>
      <IconComponent className="w-10 h-10" style={{ color: nodeData.color }} />
      <span className="text-[10px] font-semibold text-foreground text-center leading-tight w-full">
        {displayName}
      </span>
      {nodeData.customLabel && (
        <span className="text-[8px] text-muted-foreground text-center -mt-1">{t(nodeData.label)}</span>
      )}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
    </div>
  );
};

/* ── Icon-style node (wait element with circle) ── */
const IconStyleRender = ({ nodeData, onDoubleClick }: { nodeData: FunnelNodeData; onDoubleClick?: () => void }) => {
  const { t } = useTranslation();
  const IconComponent = (Icons as any)[nodeData.icon] || Icons.FileText;
  const isWait = nodeData.pageType === "wait";
  const displayName = isWait ? getWaitLabel(nodeData, t) : (nodeData.customLabel || t(nodeData.label));
  const isDecision = nodeData.isDecision ?? false;

  return (
    <div className="flex flex-col items-center gap-1.5 w-[100px] relative overflow-visible" onDoubleClickCapture={onDoubleClick}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-card shadow-sm"
        style={{ borderColor: nodeData.color }}
      >
        <IconComponent className="w-5 h-5" style={{ color: nodeData.color }} />
      </div>
      <span className="text-[10px] font-semibold text-foreground text-center leading-tight w-full">
        {displayName}
      </span>
      {!isWait && nodeData.customLabel && (
        <span className="text-[8px] text-muted-foreground text-center -mt-1">{t(nodeData.label)}</span>
      )}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" title={isDecision ? "Yes" : undefined} />
      {isDecision && (
        <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !bg-red-500 !border-2 !border-white" title="No" />
      )}
      {isDecision && (
        <>
          <div className="absolute right-0 top-[24px] translate-x-[14px] text-[7px] font-bold text-emerald-600 select-none pointer-events-none">Y</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[14px] text-[7px] font-bold text-red-500 select-none pointer-events-none">N</div>
        </>
      )}
    </div>
  );
};

/* ── Note-style node (sticky note with theme color) ── */
const NoteStyleRender = ({ nodeData }: { nodeData: FunnelNodeData }) => {
  const themeColor = nodeData.themeColor || nodeData.color || "#F59E0B";
  const textColor = isColorDark(themeColor) ? "#ffffff" : "#1a1a1a";

  return (
    <div className="relative overflow-visible">
      <div
        className="min-w-[140px] max-w-[260px] rounded-md px-3 py-2 shadow-sm border border-border/50"
        style={{ backgroundColor: `${themeColor}CC` }}
      >
        <p className="text-xs whitespace-pre-wrap break-words leading-relaxed" style={{ color: textColor }}>
          {nodeData.noteContent || "Double-click to edit..."}
        </p>
      </div>
    </div>
  );
};

/* ── Text-style node (plain text label with styling) ── */
const TextStyleRender = ({ nodeData }: { nodeData: FunnelNodeData }) => {
  const fontSize = nodeData.textSize || 12;
  const textColor = nodeData.textColor || nodeData.color || "#6B7280";

  return (
    <div className="relative overflow-visible">
      <div className="min-w-[80px] max-w-[260px] px-2 py-1">
        <p
          className="whitespace-pre-wrap break-words leading-relaxed"
          style={{
            color: textColor,
            fontSize: `${fontSize}px`,
            fontWeight: nodeData.textBold ? "bold" : "normal",
            fontStyle: nodeData.textItalic ? "italic" : "normal",
            textDecoration: nodeData.textUnderline ? "underline" : "none",
          }}
        >
          {nodeData.noteContent || "Double-click to edit..."}
        </p>
      </div>
    </div>
  );
};

/* ── Shape resize handle helper ── */
const HANDLE_SIZE = 8;
type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const cursorMap: Record<ResizeDir, string> = {
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize",
};

const useShapeResize = (
  width: number,
  height: number,
  onResize: (w: number, h: number) => void,
) => {
  const startRef = useRef<{ x: number; y: number; w: number; h: number; dir: ResizeDir } | null>(null);

  const onMouseDown = useCallback((dir: ResizeDir, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY, w: width, h: height, dir };

    const onMouseMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const { x, y, w, h, dir: d } = startRef.current;
      let dx = ev.clientX - x;
      let dy = ev.clientY - y;
      let nw = w, nh = h;
      if (d.includes("e")) nw = Math.max(40, w + dx);
      if (d.includes("w")) nw = Math.max(40, w - dx);
      if (d.includes("s")) nh = Math.max(40, h + dy);
      if (d.includes("n")) nh = Math.max(40, h - dy);
      onResize(Math.round(nw), Math.round(nh));
    };

    const onMouseUp = () => {
      startRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [width, height, onResize]);

  return onMouseDown;
};

const ResizeHandles = ({ width, height, onMouseDown }: {
  width: number; height: number;
  onMouseDown: (dir: ResizeDir, e: React.MouseEvent) => void;
}) => {
  const hs = HANDLE_SIZE;
  const handles: { dir: ResizeDir; style: React.CSSProperties }[] = [
    { dir: "n", style: { top: -hs / 2, left: hs, right: hs, height: hs, cursor: cursorMap.n } },
    { dir: "s", style: { bottom: -hs / 2, left: hs, right: hs, height: hs, cursor: cursorMap.s } },
    { dir: "e", style: { right: -hs / 2, top: hs, bottom: hs, width: hs, cursor: cursorMap.e } },
    { dir: "w", style: { left: -hs / 2, top: hs, bottom: hs, width: hs, cursor: cursorMap.w } },
    { dir: "nw", style: { top: -hs / 2, left: -hs / 2, width: hs * 2, height: hs * 2, cursor: cursorMap.nw } },
    { dir: "ne", style: { top: -hs / 2, right: -hs / 2, width: hs * 2, height: hs * 2, cursor: cursorMap.ne } },
    { dir: "sw", style: { bottom: -hs / 2, left: -hs / 2, width: hs * 2, height: hs * 2, cursor: cursorMap.sw } },
    { dir: "se", style: { bottom: -hs / 2, right: -hs / 2, width: hs * 2, height: hs * 2, cursor: cursorMap.se } },
  ];

  return (
    <>
      {handles.map(({ dir, style }) => (
        <div
          key={dir}
          className="absolute z-10"
          style={{ ...style, position: "absolute" }}
          onMouseDown={(e) => onMouseDown(dir, e)}
        />
      ))}
      {/* Corner dots */}
      {(["nw", "ne", "sw", "se"] as ResizeDir[]).map((dir) => {
        const isTop = dir.includes("n");
        const isLeft = dir.includes("w");
        return (
          <div
            key={`dot-${dir}`}
            className="absolute w-2 h-2 rounded-full bg-primary border border-primary-foreground pointer-events-none z-20"
            style={{
              top: isTop ? -4 : undefined,
              bottom: isTop ? undefined : -4,
              left: isLeft ? -4 : undefined,
              right: isLeft ? undefined : -4,
            }}
          />
        );
      })}
    </>
  );
};

/* ── Shape-style node ── */
const ShapeStyleRender = ({ nodeData, onDoubleClick, nodeId }: { nodeData: FunnelNodeData; onDoubleClick?: () => void; nodeId: string }) => {
  const shapeType = nodeData.shapeType || "square";
  const borderStyle = nodeData.shapeBorderStyle || "solid";
  const isTransparent = nodeData.shapeTransparent ?? false;
  const width = nodeData.shapeWidth || 120;
  const height = nodeData.shapeHeight || 120;
  const color = nodeData.color || "#9CA3AF";

  const handleResize = useCallback((w: number, h: number) => {
    window.dispatchEvent(new CustomEvent("funnel-node-resize", { detail: { nodeId, width: w, height: h } }));
  }, [nodeId]);

  const onHandleMouseDown = useShapeResize(width, height, handleResize);

  if (shapeType === "circle") {
    const diameter = Math.min(width, height);
    return (
      <div className="relative" style={{ width: diameter, height: diameter }} onDoubleClickCapture={onDoubleClick}>
        <div
          style={{
            width: diameter,
            height: diameter,
            borderRadius: "50%",
            border: `3px ${borderStyle} ${color}`,
            backgroundColor: isTransparent ? "transparent" : `${color}10`,
          }}
        />
        <ResizeHandles width={diameter} height={diameter} onMouseDown={onHandleMouseDown} />
      </div>
    );
  }

  if (shapeType === "triangle") {
    return (
      <div className="relative" style={{ width, height }} onDoubleClickCapture={onDoubleClick}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <polygon
            points={`${width / 2},4 ${width - 4},${height - 4} 4,${height - 4}`}
            fill={isTransparent ? "none" : `${color}10`}
            stroke={color}
            strokeWidth="3"
            strokeDasharray={borderStyle === "dashed" ? "8,6" : borderStyle === "dotted" ? "3,3" : "none"}
          />
        </svg>
        <ResizeHandles width={width} height={height} onMouseDown={onHandleMouseDown} />
      </div>
    );
  }

  // Default: square/rectangle
  return (
    <div className="relative" style={{ width, height }} onDoubleClickCapture={onDoubleClick}>
      <div
        style={{
          width,
          height,
          border: `3px ${borderStyle} ${color}`,
          borderRadius: 4,
          backgroundColor: isTransparent ? "transparent" : `${color}10`,
        }}
      />
      <ResizeHandles width={width} height={height} onMouseDown={onHandleMouseDown} />
    </div>
  );
};

/* ── determine if element is "email-like" (no circle icon) ── */
const EMAIL_STYLE_TYPES = ["email", "broadcast-email", "sms", "fb-messenger", "chatbot", "chatbot-optin", "phone-call", "phone-order"];

/* ── Page-style node (wireframe thumbnail) ── */
const FunnelNode = memo(({ data, id }: NodeProps) => {
  const { t } = useTranslation();
  const nodeData = data as unknown as FunnelNodeData;
  const displayName = nodeData.customLabel || t(nodeData.label);
  const isDecision = nodeData.isDecision ?? false;
  const renderStyle = nodeData.renderStyle ?? "page";

  const handleDoubleClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent("funnel-node-dblclick", { detail: { nodeId: id } }));
  }, [id]);

  const copySections = nodeData.copySections ?? [];

  if (renderStyle === "shape") return <div onDoubleClickCapture={handleDoubleClick}><ShapeStyleRender nodeData={nodeData} onDoubleClick={handleDoubleClick} /></div>;
  if (renderStyle === "note") return <div onDoubleClickCapture={handleDoubleClick}><NoteStyleRender nodeData={nodeData} /></div>;
  if (renderStyle === "text") return <div onDoubleClickCapture={handleDoubleClick}><TextStyleRender nodeData={nodeData} /></div>;

  // Email-like elements: large icon without circle
  if (renderStyle === "icon" && EMAIL_STYLE_TYPES.includes(nodeData.pageType)) {
    return <EmailStyleRender nodeData={nodeData} onDoubleClick={handleDoubleClick} />;
  }

  // Other icon elements (wait)
  if (renderStyle === "icon") return <IconStyleRender nodeData={nodeData} onDoubleClick={handleDoubleClick} />;

  const WireframeComponent = getWireframeForType(nodeData.pageType);
  const isImageMode = Boolean(nodeData.showImages);
  const imgSrc = nodeData.nodeImageThumb || nodeData.nodeImage;
  const showImage = isImageMode && imgSrc;
  const isReadOnly = Boolean(nodeData.readOnly);
  const hasUrl = Boolean(nodeData.nodeUrl);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card w-[160px] group hover:shadow-card-hover transition-shadow relative overflow-visible" onDoubleClickCapture={handleDoubleClick}>
      <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: nodeData.color }} />

      <div className="px-3 pt-2 pb-1 text-center">
        <span className="text-[10px] font-semibold text-foreground block leading-tight">{displayName}</span>
        {nodeData.customLabel && (
          <span className="text-[9px] text-muted-foreground block mt-0.5">{t(nodeData.label)}</span>
        )}
      </div>

      {/* Wireframe or image thumbnail */}
      <div className="px-2 pt-1 pb-2">
        {showImage ? (
          <img
            src={imgSrc}
            alt={displayName}
            loading="lazy"
            className="w-full h-[240px] object-cover object-top rounded"
          />
        ) : (
          <div className="space-y-2">
            <WireframeComponent color={nodeData.color} />
            {!isImageMode && copySections.length > 0 && (
              <div className="border-t border-border px-1 pt-2 space-y-1">
                {copySections.map((section, index) => (
                  <div key={section.id || `${section.title}-${index}`} className="text-[9px] leading-tight text-muted-foreground break-words border border-border rounded px-1.5 py-1">
                    {section.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View page button in read-only mode */}
      {isReadOnly && hasUrl && (
        <div className="px-2 pb-2">
          <a
            href={nodeData.nodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 w-full text-[9px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded py-1 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Visit page
          </a>
        </div>
      )}

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
        title={isDecision ? "Yes" : undefined}
      />
      {isDecision && (
        <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !bg-red-500 !border-2 !border-white" title="No" />
      )}
      {isDecision && (
        <>
          <div className="absolute right-0 top-1/2 translate-x-[14px] -translate-y-1/2 text-[7px] font-bold text-emerald-600 select-none pointer-events-none">Y</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[14px] text-[7px] font-bold text-red-500 select-none pointer-events-none">N</div>
        </>
      )}
    </div>
  );
});

FunnelNode.displayName = "FunnelNode";
export default FunnelNode;
