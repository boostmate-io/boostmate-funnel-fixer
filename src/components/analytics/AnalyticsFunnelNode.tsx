import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { ExternalLink } from "lucide-react";

type AnalyticsFunnelNodeData = {
  label: string;
  customLabel?: string;
  pageType: string;
  icon: string;
  color: string;
  nodeUrl?: string;
  nodeImage?: string;
  nodeImageThumb?: string;
  analyticsMetrics?: { label: string; value: string }[];
};

const AnalyticsFunnelNode = memo(({ data }: NodeProps) => {
  const { t } = useTranslation();
  const d = data as unknown as AnalyticsFunnelNodeData;
  const IconComponent = (Icons as any)[d.icon] || Icons.FileText;
  const displayName = d.customLabel || t(d.label);
  const thumb = d.nodeImageThumb || d.nodeImage;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card min-w-[170px] max-w-[210px] overflow-hidden">
      <div className="h-2 w-full" style={{ backgroundColor: d.color }} />
      <div className="p-3 flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${d.color}15` }}>
          <IconComponent className="w-4 h-4" style={{ color: d.color }} />
        </div>
        <span className="text-xs font-medium text-foreground text-center">{displayName}</span>
        {d.customLabel && <span className="text-[9px] text-muted-foreground text-center leading-tight">{t(d.label)}</span>}
      </div>
      {thumb && (
        <div className="px-3 pb-2">
          <div
            className="relative w-full group/img cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              const fullSrc = d.nodeImage || d.nodeImageThumb;
              if (fullSrc) {
                window.dispatchEvent(new CustomEvent("funnel-node-image-view", { detail: { src: fullSrc } }));
              }
            }}
          >
            <img
              src={thumb}
              alt={displayName}
              className="w-full h-24 object-cover object-top rounded border border-border"
              loading="lazy"
            />
            <div className="absolute inset-0 rounded bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
              <Icons.Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
            </div>
          </div>
        </div>
      )}
      {d.nodeUrl && (
        <div className="px-3 pb-2">
          <a
            href={d.nodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline truncate"
            title={d.nodeUrl}
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{d.nodeUrl.replace(/^https?:\/\//, "")}</span>
          </a>
        </div>
      )}
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
