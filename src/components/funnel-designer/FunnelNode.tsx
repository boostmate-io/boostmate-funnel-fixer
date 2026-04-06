import { memo, useCallback } from "react";
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
  renderStyle?: "page" | "icon" | "note" | "text";
  noteContent?: string;
  waitType?: "days" | "hours" | "minutes";
  waitDuration?: number;
  nodeImage?: string;
  showImages?: boolean;
};

/* ── helper: build wait label ── */
const getWaitLabel = (data: FunnelNodeData, t: (k: string) => string): string => {
  if (data.waitDuration && data.waitType) {
    const n = data.waitDuration;
    const unitKey = n === 1
      ? `funnelDesigner.wait${data.waitType.charAt(0).toUpperCase() + data.waitType.slice(1, -1)}`
      : `funnelDesigner.wait${data.waitType.charAt(0).toUpperCase() + data.waitType.slice(1)}`;
    // waitDay/waitDays, waitHour/waitHours, waitMinute/waitMinutes
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
    <div className="flex flex-col items-center gap-1.5 w-[100px] relative overflow-visible" onDoubleClick={onDoubleClick}>
      <IconComponent className="w-10 h-10" style={{ color: nodeData.color }} />
      <span className="text-[10px] font-semibold text-foreground text-center leading-tight w-full">
        {displayName}
      </span>
      {nodeData.customLabel && (
        <span className="text-[8px] text-muted-foreground text-center -mt-1">{t(nodeData.label)}</span>
      )}

      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />
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
    <div className="flex flex-col items-center gap-1.5 w-[100px] relative overflow-visible" onDoubleClick={onDoubleClick}>
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
          <div className="absolute right-0 top-[24px] translate-x-[14px] text-[7px] font-bold text-emerald-600 select-none pointer-events-none">Y</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[14px] text-[7px] font-bold text-red-500 select-none pointer-events-none">N</div>
        </>
      )}
    </div>
  );
};

/* ── Note-style node (sticky note) ── */
const NoteStyleRender = ({ nodeData }: { nodeData: FunnelNodeData }) => (
  <div className="relative overflow-visible">
    <div
      className="min-w-[140px] max-w-[260px] rounded-md px-3 py-2 shadow-sm border border-border/50"
      style={{ backgroundColor: `${nodeData.color}CC` }}
    >
      <p className="text-xs text-white whitespace-pre-wrap break-words leading-relaxed">
        {nodeData.noteContent || "Double-click to edit..."}
      </p>
    </div>
  </div>
);

/* ── Text-style node (plain text label) ── */
const TextStyleRender = ({ nodeData }: { nodeData: FunnelNodeData }) => (
  <div className="relative overflow-visible">
    <div className="min-w-[80px] max-w-[260px] px-2 py-1">
      <p className="text-xs font-medium whitespace-pre-wrap break-words leading-relaxed" style={{ color: nodeData.color }}>
        {nodeData.noteContent || "Double-click to edit..."}
      </p>
    </div>
  </div>
);

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

  if (renderStyle === "note") return <div onDoubleClick={handleDoubleClick}><NoteStyleRender nodeData={nodeData} /></div>;
  if (renderStyle === "text") return <div onDoubleClick={handleDoubleClick}><TextStyleRender nodeData={nodeData} /></div>;

  // Email-like elements: large icon without circle
  if (renderStyle === "icon" && EMAIL_STYLE_TYPES.includes(nodeData.pageType)) {
    return <EmailStyleRender nodeData={nodeData} onDoubleClick={handleDoubleClick} />;
  }

  // Other icon elements (wait)
  if (renderStyle === "icon") return <IconStyleRender nodeData={nodeData} onDoubleClick={handleDoubleClick} />;

  const WireframeComponent = getWireframeForType(nodeData.pageType);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card w-[160px] group hover:shadow-card-hover transition-shadow relative overflow-visible" onDoubleClick={handleDoubleClick}>
      <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: nodeData.color }} />

      {/* Wireframe thumbnail */}
      <div className="px-2 pt-2 pb-1 min-h-[80px]">
        <WireframeComponent color={nodeData.color} />
      </div>

      {/* Label */}
      <div className="px-3 pb-2 pt-1 text-center">
        <span className="text-[10px] font-semibold text-foreground">{displayName}</span>
      </div>
      {nodeData.customLabel && (
        <div className="px-3 pb-2 -mt-1 text-center">
          <span className="text-[9px] text-muted-foreground">{t(nodeData.label)}</span>
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
