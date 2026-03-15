import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { TRAFFIC_SOURCES, FUNNEL_PAGES } from "./constants";

interface ElementsPanelProps {
  onAddNode: (type: string, category: "traffic" | "page") => void;
}

const ElementsPanel = ({ onAddNode }: ElementsPanelProps) => {
  const { t } = useTranslation();

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-display font-bold text-foreground text-sm">{t("funnelDesigner.addElements")}</h3>
        <p className="text-[11px] text-muted-foreground">{t("funnelDesigner.clickToAdd")}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Traffic Sources */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("funnelDesigner.trafficSources")}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TRAFFIC_SOURCES.map((source) => {
              const IconComponent = (Icons as any)[source.icon] || Icons.Globe;
              return (
                <button
                  key={source.type}
                  onClick={() => onAddNode(source.type, "traffic")}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors group"
                  title={source.label}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${source.color}15` }}
                  >
                    <IconComponent className="w-4 h-4" style={{ color: source.color }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{source.label.slice(0, 5)}...</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Funnel Pages */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("funnelDesigner.funnelPages")}
          </p>
          <div className="space-y-1">
            {FUNNEL_PAGES.map((page) => {
              const IconComponent = (Icons as any)[page.icon] || Icons.FileText;
              return (
                <button
                  key={page.type}
                  onClick={() => onAddNode(page.type, "page")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <IconComponent className="w-4 h-4 shrink-0" style={{ color: page.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{t(page.label)}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t(page.description)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ElementsPanel;
