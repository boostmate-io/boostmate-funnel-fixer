import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";

type AnalyticsFunnelNodeData = {
  label: string;
  customLabel?: string;
  pageType: string;
  icon: string;
  color: string;
  analyticsMetrics?: { label: string; value: string }[];
};

const AnalyticsFunnelNode = memo(({ data }: NodeProps) => {
  const { t } = useTranslation();
  const d = data as unknown as AnalyticsFunnelNodeData;
  const IconComponent = (Icons as any)[d.icon] || Icons.FileText;
  const displayName = d.customLabel || t(d.label);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card min-w-[170px] overflow-hidden">
      <div className="h-2 w-full" style={{ backgroundColor: d.color }} />
      <div className="p-3 flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${d.color}15` }}>
          <IconComponent className="w-4 h-4" style={{ color: d.color }} />
        </div>
        <span className="text-xs font-medium text-foreground text-center">{displayName}</span>
        {d.customLabel && <span className="text-[9px] text-muted-foreground text-center leading-tight">{t(d.label)}</span>}
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
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
    </div>
  );
});

AnalyticsFunnelNode.displayName = "AnalyticsFunnelNode";
export default AnalyticsFunnelNode;
