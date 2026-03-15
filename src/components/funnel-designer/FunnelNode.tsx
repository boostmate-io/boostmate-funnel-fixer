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
};

const FunnelNode = memo(({ data }: NodeProps) => {
  const { t } = useTranslation();
  const nodeData = data as unknown as FunnelNodeData;
  const IconComponent = (Icons as any)[nodeData.icon] || Icons.FileText;
  const displayName = nodeData.customLabel || t(nodeData.label);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card min-w-[160px] overflow-hidden group hover:shadow-card-hover transition-shadow">
      <div className="h-2 w-full" style={{ backgroundColor: nodeData.color }} />
      <div className="p-4 flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${nodeData.color}15` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: nodeData.color }} />
        </div>
        <span className="text-xs font-medium text-foreground text-center">
          {displayName}
        </span>
        {nodeData.customLabel && (
          <span className="text-[10px] text-muted-foreground text-center">
            {t(nodeData.label)}
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    </div>
  );
});

FunnelNode.displayName = "FunnelNode";
export default FunnelNode;
