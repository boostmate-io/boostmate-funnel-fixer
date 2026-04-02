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
};

// Wireframe-style thumbnail lines for visual representation
const WireframePreview = ({ color }: { color: string }) => (
  <div className="w-full space-y-1 px-1">
    {/* Header bar */}
    <div className="h-2 rounded-sm w-full" style={{ backgroundColor: `${color}30` }} />
    {/* Hero area */}
    <div className="h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
      <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: `${color}25` }} />
    </div>
    {/* Content lines */}
    <div className="space-y-0.5">
      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}20` }} />
      <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: `${color}15` }} />
      <div className="h-1 rounded-full w-5/6" style={{ backgroundColor: `${color}15` }} />
    </div>
    {/* CTA button */}
    <div className="h-2.5 rounded-sm w-2/3 mx-auto" style={{ backgroundColor: `${color}35` }} />
  </div>
);

const FunnelNode = memo(({ data }: NodeProps) => {
  const { t } = useTranslation();
  const nodeData = data as unknown as FunnelNodeData;
  const IconComponent = (Icons as any)[nodeData.icon] || Icons.FileText;
  const displayName = nodeData.customLabel || t(nodeData.label);
  const isDecision = nodeData.isDecision ?? false;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card w-[180px] overflow-hidden group hover:shadow-card-hover transition-shadow relative">
      <div className="h-1.5 w-full" style={{ backgroundColor: nodeData.color }} />

      {/* Wireframe thumbnail */}
      <div className="px-2 pt-2 pb-1">
        <WireframePreview color={nodeData.color} />
      </div>

      {/* Label */}
      <div className="px-3 pb-2 pt-1 flex items-center gap-1.5">
        <IconComponent className="w-3.5 h-3.5 shrink-0" style={{ color: nodeData.color }} />
        <span className="text-[10px] font-semibold text-foreground truncate">
          {displayName}
        </span>
      </div>
      {nodeData.customLabel && (
        <div className="px-3 pb-2 -mt-1">
          <span className="text-[9px] text-muted-foreground">{t(nodeData.label)}</span>
        </div>
      )}

      {/* Target handle - left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground"
      />

      {/* Source handle - right (for all: next step / yes path) */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
        title={isDecision ? "Yes" : undefined}
      />

      {/* No handle - bottom (only for decision elements) */}
      {isDecision && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="no"
          className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
          title="No"
        />
      )}

      {/* Yes/No indicators */}
      {isDecision && (
        <>
          <div className="absolute right-0 top-1/2 translate-x-[14px] -translate-y-1/2 text-[7px] font-bold text-emerald-600 select-none pointer-events-none">
            Y
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[14px] text-[7px] font-bold text-red-500 select-none pointer-events-none">
            N
          </div>
        </>
      )}
    </div>
  );
});

FunnelNode.displayName = "FunnelNode";
export default FunnelNode;
