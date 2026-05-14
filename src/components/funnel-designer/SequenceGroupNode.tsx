import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

export type SequenceGroupData = {
  label?: string;
  notes?: string;
  collapsed?: boolean;
  childIds?: string[];
  width?: number;
  height?: number;
};

const SequenceGroupNode = memo(({ data, id }: NodeProps<any>) => {
  const d = data as SequenceGroupData;
  const collapsed = !!d.collapsed;
  const label = d.label || "Sequence";
  const count = d.childIds?.length ?? 0;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("sequence-group-toggle", { detail: { id } }));
  };

  if (collapsed) {
    return (
      <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border-2 border-primary/50 shadow-sm min-w-[220px]">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{label}</p>
          <p className="text-[10px] text-muted-foreground">
            {count} step{count === 1 ? "" : "s"} · click to expand
          </p>
        </div>
        <button onClick={toggle} className="p-1 rounded hover:bg-primary/20" title="Expand sequence">
          <ChevronRight className="w-3.5 h-3.5 text-primary" />
        </button>
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-primary-foreground" />
      </div>
    );
  }

  return (
    <div
      style={{ width: d.width || 400, height: d.height || 200 }}
      className="relative rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
    >
      <div className="absolute -top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background border border-primary/50 shadow-sm">
        <Layers className="w-3 h-3 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        <button onClick={toggle} className="ml-1 p-0.5 rounded hover:bg-muted" title="Collapse sequence">
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
});

SequenceGroupNode.displayName = "SequenceGroupNode";
export default SequenceGroupNode;
