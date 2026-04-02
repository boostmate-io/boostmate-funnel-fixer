import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TRAFFIC_SOURCES,
  TRAFFIC_SOURCE_GROUPS,
  FUNNEL_ELEMENTS,
  FUNNEL_ELEMENT_GROUPS,
} from "./constants";

interface ElementsPanelProps {
  onAddNode: (type: string, category: "traffic" | "page") => void;
}

const ElementsPanel = ({ onAddNode }: ElementsPanelProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // All groups collapsed by default
  const allGroups: Record<string, boolean> = {};
  TRAFFIC_SOURCE_GROUPS.forEach((g) => { allGroups[`traffic-${g}`] = true; });
  FUNNEL_ELEMENT_GROUPS.forEach((g) => { allGroups[`element-${g}`] = true; });

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(allGroups);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const searchLower = search.toLowerCase();

  const filteredTraffic = search
    ? TRAFFIC_SOURCES.filter((s) => s.label.toLowerCase().includes(searchLower))
    : TRAFFIC_SOURCES;

  const filteredElements = search
    ? FUNNEL_ELEMENTS.filter(
        (e) =>
          t(e.label).toLowerCase().includes(searchLower) ||
          e.type.toLowerCase().includes(searchLower)
      )
    : FUNNEL_ELEMENTS;

  // When searching, expand all groups
  const isCollapsed = (key: string) => search ? false : (collapsedGroups[key] ?? true);

  const onDragStart = (
    e: React.DragEvent,
    type: string,
    category: "traffic" | "page",
    label: string,
    icon: string,
    color: string,
    renderStyle?: string
  ) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ type, category, label, icon, color, renderStyle })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0 overflow-hidden">
      <div className="p-3 border-b border-border space-y-2">
        <h3 className="font-display font-bold text-foreground text-sm">
          {t("funnelDesigner.addElements")}
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("funnelDesigner.searchElements")}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Section header: Traffic Sources */}
          <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider px-1 pt-1 pb-1">
            Traffic Sources
          </h4>

          {TRAFFIC_SOURCE_GROUPS.map((group) => {
            const items = filteredTraffic.filter((s) => s.group === group);
            if (items.length === 0) return null;
            const collapsed = isCollapsed(`traffic-${group}`);

            return (
              <div key={`traffic-${group}`}>
                <button
                  onClick={() => toggleGroup(`traffic-${group}`)}
                  className="flex items-center justify-between w-full py-1.5 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span>{group}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!collapsed && (
                  <div className="grid grid-cols-4 gap-1 pb-2">
                    {items.map((source) => {
                      const IconComponent = (Icons as any)[source.icon] || Icons.Globe;
                      return (
                        <div
                          key={source.type}
                          draggable
                          onDragStart={(e) =>
                            onDragStart(e, source.type, "traffic", source.label, source.icon, source.color)
                          }
                          className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-accent transition-colors cursor-grab active:cursor-grabbing group"
                          title={source.label}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ backgroundColor: `${source.color}15` }}
                          >
                            <IconComponent className="w-3.5 h-3.5" style={{ color: source.color }} />
                          </div>
                          <span className="text-[8px] text-muted-foreground truncate w-full text-center leading-tight">
                            {source.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Section header: Funnel Elements */}
          <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider px-1 pt-1 pb-1">
            Funnel Elements
          </h4>

          {FUNNEL_ELEMENT_GROUPS.map((group) => {
            const items = filteredElements.filter((e) => e.group === group);
            if (items.length === 0) return null;
            const collapsed = isCollapsed(`element-${group}`);

            return (
              <div key={`element-${group}`}>
                <button
                  onClick={() => toggleGroup(`element-${group}`)}
                  className="flex items-center justify-between w-full py-1.5 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span>{group}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!collapsed && (
                  <div className="space-y-0.5 pb-2">
                    {items.map((el) => {
                      const IconComponent = (Icons as any)[el.icon] || Icons.FileText;
                      return (
                        <div
                          key={el.type}
                          draggable
                          onDragStart={(e) =>
                            onDragStart(e, el.type, "page", t(el.label), el.icon, el.color, el.renderStyle)
                          }
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors cursor-grab active:cursor-grabbing group"
                        >
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${el.color}15` }}
                          >
                            <IconComponent className="w-3.5 h-3.5" style={{ color: el.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-foreground leading-tight">
                              {t(el.label)}
                            </p>
                          </div>
                          {el.isDecision && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium shrink-0">
                              Y/N
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ElementsPanel;
