import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";

type FunnelNodeData = {
  label: string;
  customLabel?: string;
  pageType: string;
  icon: string;
  color: string;
  isDecision?: boolean;
  renderStyle?: "page" | "icon" | "note" | "text";
  noteContent?: string;
};

/* ── Wireframe thumbnails per element type ── */

const OptInPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="h-4 rounded-sm" style={{ backgroundColor: `${color}12` }} />
    <div className="space-y-0.5">
      <div className="h-1.5 rounded-sm w-full border" style={{ borderColor: `${color}30` }} />
      <div className="h-1.5 rounded-sm w-full border" style={{ borderColor: `${color}30` }} />
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

const SalesPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="h-5 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
      <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: `${color}25` }}>
        <div className="w-2 h-2 mx-auto mt-0.5 rounded-full" style={{ backgroundColor: `${color}40` }} />
      </div>
    </div>
    <div className="flex gap-0.5">
      <div className="h-2 rounded-sm flex-1" style={{ backgroundColor: `${color}15` }} />
      <div className="h-2 rounded-sm flex-1" style={{ backgroundColor: `${color}15` }} />
      <div className="h-2 rounded-sm flex-1" style={{ backgroundColor: `${color}15` }} />
    </div>
    <div className="space-y-0.5">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}20` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}15` }} />
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

const OrderFormPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="flex gap-0.5 justify-center">
      {[1,2,3,4].map(i => <div key={i} className="w-3 h-2 rounded-sm" style={{ backgroundColor: `${color}20` }} />)}
    </div>
    <div className="space-y-0.5">
      <div className="h-1.5 rounded-sm w-full border" style={{ borderColor: `${color}30` }} />
      <div className="h-1.5 rounded-sm w-full border" style={{ borderColor: `${color}30` }} />
      <div className="h-1.5 rounded-sm w-full border" style={{ borderColor: `${color}30` }} />
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

const ThankYouPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}25` }}>
        <div className="w-2 h-0.5 rounded-full" style={{ backgroundColor: `${color}50` }} />
      </div>
    </div>
    <div className="space-y-0.5">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}20` }} />
      <div className="h-1 rounded-full w-4/5 mx-auto" style={{ backgroundColor: `${color}15` }} />
      <div className="h-1 rounded-full w-3/5 mx-auto" style={{ backgroundColor: `${color}15` }} />
    </div>
  </div>
);

const WebinarPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
      <div className="w-5 h-4 rounded-sm border flex items-center justify-center" style={{ borderColor: `${color}30` }}>
        <div className="w-0 h-0 border-l-4 border-t-2 border-b-2 border-l-current border-t-transparent border-b-transparent" style={{ color: `${color}50` }} />
      </div>
    </div>
    <div className="space-y-0.5">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}20` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}15` }} />
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

const UpsellPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="h-4 rounded-sm" style={{ backgroundColor: `${color}12` }} />
    <div className="flex gap-0.5 justify-center">
      <div className="w-5 h-2 rounded-sm text-center" style={{ backgroundColor: `${color}15` }} />
      <div className="w-5 h-2 rounded-sm" style={{ backgroundColor: `${color}25` }} />
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
    <div className="h-1.5 rounded-sm w-1/2 mx-auto" style={{ backgroundColor: `${color}15` }} />
  </div>
);

const SurveyPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="space-y-0.5">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full border" style={{ borderColor: `${color}40` }} />
          <div className="h-1 rounded-full flex-1" style={{ backgroundColor: `${color}15` }} />
        </div>
      ))}
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}40` }} />
  </div>
);

const MembershipPreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="grid grid-cols-2 gap-0.5">
      {[1,2,3,4].map(i => <div key={i} className="h-3 rounded-sm" style={{ backgroundColor: `${color}12` }} />)}
    </div>
    <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}15` }} />
  </div>
);

const DefaultPagePreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    <div className="h-5 rounded-sm" style={{ backgroundColor: `${color}12` }} />
    <div className="space-y-0.5">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}20` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}15` }} />
      <div className="h-1 rounded-full w-5/6" style={{ backgroundColor: `${color}15` }} />
    </div>
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}35` }} />
  </div>
);

const getWireframeForType = (pageType: string) => {
  switch (pageType) {
    case "opt-in":
    case "squeeze":
    case "lead-magnet":
    case "chatbot-optin":
      return OptInPreview;
    case "sales":
    case "vsl":
    case "webinar-sales":
      return SalesPreview;
    case "order-form":
    case "checkout":
    case "2step-order":
    case "tripwire":
      return OrderFormPreview;
    case "thank-you":
    case "confirmation":
      return ThankYouPreview;
    case "webinar-register":
    case "webinar-live":
    case "webinar-replay":
      return WebinarPreview;
    case "upsell":
    case "downsell":
    case "oto":
      return UpsellPreview;
    case "survey":
    case "application":
    case "booking":
    case "calendar":
      return SurveyPreview;
    case "membership":
    case "course-dashboard":
    case "community":
      return MembershipPreview;
    default:
      return DefaultPagePreview;
  }
};

const IconStyleRender = ({ nodeData }: { nodeData: FunnelNodeData }) => {
  const { t } = useTranslation();
  const IconComponent = (Icons as any)[nodeData.icon] || Icons.FileText;
  const displayName = nodeData.customLabel || t(nodeData.label);
  const isDecision = nodeData.isDecision ?? false;

  return (
    <div className="flex flex-col items-center gap-1.5 w-[100px] relative overflow-visible">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-card shadow-sm"
        style={{ borderColor: nodeData.color }}
      >
        <IconComponent className="w-5 h-5" style={{ color: nodeData.color }} />
      </div>
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
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
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
    <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    <Handle type="source" position={Position.Right} id="yes" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
  </div>
);

/* ── Page-style node (wireframe thumbnail) ── */
const FunnelNode = memo(({ data }: NodeProps) => {
  const { t } = useTranslation();
  const nodeData = data as unknown as FunnelNodeData;
  const displayName = nodeData.customLabel || t(nodeData.label);
  const isDecision = nodeData.isDecision ?? false;
  const renderStyle = nodeData.renderStyle ?? "page";

  // Delegate to special styles
  if (renderStyle === "icon") return <IconStyleRender nodeData={nodeData} />;
  if (renderStyle === "note") return <NoteStyleRender nodeData={nodeData} />;
  if (renderStyle === "text") return <TextStyleRender nodeData={nodeData} />;

  const WireframeComponent = getWireframeForType(nodeData.pageType);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card w-[180px] group hover:shadow-card-hover transition-shadow relative overflow-visible">
      <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: nodeData.color }} />

      {/* Wireframe thumbnail */}
      <div className="px-2 pt-2 pb-1">
        <WireframeComponent color={nodeData.color} />
      </div>

      {/* Label - centered, no icon */}
      <div className="px-3 pb-2 pt-1 text-center">
        <span className="text-[10px] font-semibold text-foreground">
          {displayName}
        </span>
      </div>
      {nodeData.customLabel && (
        <div className="px-3 pb-2 -mt-1 text-center">
          <span className="text-[9px] text-muted-foreground">{t(nodeData.label)}</span>
        </div>
      )}

      {/* Target handles - left and top */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />

      {/* Source handle - right (yes path) */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
        title={isDecision ? "Yes" : undefined}
      />

      {/* No handle - bottom (only for decision elements) */}
      {isDecision && (
        <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !bg-red-500 !border-2 !border-white" title="No" />
      )}

      {/* Yes/No indicators */}
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
