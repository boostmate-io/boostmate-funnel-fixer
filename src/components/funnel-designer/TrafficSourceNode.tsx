import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as Icons from "lucide-react";

type TrafficNodeData = {
  label: string;
  icon: string;
  color: string;
};

const TrafficSourceNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as TrafficNodeData;
  const IconComponent = (Icons as any)[nodeData.icon] || Icons.Globe;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card w-[100px] overflow-hidden group hover:shadow-card-hover transition-shadow">
      <div className="p-3 flex flex-col items-center gap-1.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${nodeData.color}15` }}
        >
          <IconComponent className="w-4 h-4" style={{ color: nodeData.color }} />
        </div>
        <span className="text-[10px] font-medium text-foreground text-center truncate w-full">
          {nodeData.label}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    </div>
  );
});

TrafficSourceNode.displayName = "TrafficSourceNode";
export default TrafficSourceNode;
