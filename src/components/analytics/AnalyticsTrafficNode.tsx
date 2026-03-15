import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as Icons from "lucide-react";

type AnalyticsTrafficNodeData = {
  label: string;
  icon: string;
  color: string;
  analyticsMetrics?: { label: string; value: string }[];
};

const AnalyticsTrafficNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as AnalyticsTrafficNodeData;
  const IconComponent = (Icons as any)[d.icon] || Icons.Globe;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card w-[140px] overflow-hidden">
      <div className="p-3 flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${d.color}15` }}>
          <IconComponent className="w-4 h-4" style={{ color: d.color }} />
        </div>
        <span className="text-[10px] font-medium text-foreground text-center truncate w-full">{d.label}</span>
      </div>
      {d.analyticsMetrics && d.analyticsMetrics.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-0.5">
          {d.analyticsMetrics.map((m, i) => (
            <div key={i} className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-semibold text-foreground">{m.value}</span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    </div>
  );
});

AnalyticsTrafficNode.displayName = "AnalyticsTrafficNode";
export default AnalyticsTrafficNode;
