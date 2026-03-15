import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import FunnelNode from "@/components/funnel-designer/FunnelNode";
import TrafficSourceNode from "@/components/funnel-designer/TrafficSourceNode";
import { FunnelDiagram } from "@/types/audit";

const nodeTypes = {
  funnelNode: FunnelNode,
  funnelPage: FunnelNode,
  trafficSource: TrafficSourceNode,
};

interface ReadOnlyFunnelViewProps {
  diagram: FunnelDiagram;
  className?: string;
}

const ReadOnlyFunnelViewInner = ({ diagram, className = "" }: ReadOnlyFunnelViewProps) => {
  const nodes: Node[] = useMemo(
    () =>
      diagram.nodes.map((n) => ({
        ...n,
        draggable: false,
        connectable: false,
        selectable: false,
      })),
    [diagram.nodes]
  );

  const edges: Edge[] = useMemo(
    () =>
      diagram.edges.map((e) => ({
        ...e,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      })),
    [diagram.edges]
  );

  return (
    <div className={`w-full h-[280px] rounded-lg border border-border bg-background overflow-hidden ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};

const ReadOnlyFunnelView = (props: ReadOnlyFunnelViewProps) => (
  <ReactFlowProvider>
    <ReadOnlyFunnelViewInner {...props} />
  </ReactFlowProvider>
);

export default ReadOnlyFunnelView;
