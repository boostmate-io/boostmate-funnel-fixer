import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Clock } from "lucide-react";
import ScoreGauge from "./ScoreGauge";

interface AuditRow {
  id: string;
  target_audience: string;
  offer: string;
  landing_page_url: string;
  traffic_source: string;
  monthly_traffic: string;
  conversion_rate: string;
  funnel_strategy: string;
  email: string;
  score: number | null;
  result: any;
  created_at: string;
  landing_page_screenshot?: string;
}

interface AuditListProps {
  onNewAudit: () => void;
  onViewAudit: (audit: AuditRow) => void;
}

const AuditList = ({ onNewAudit, onViewAudit }: AuditListProps) => {
  const { t } = useTranslation();
  const { activeSubAccountId } = useWorkspace();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudits();
  }, [activeSubAccountId]);

  const fetchAudits = async () => {
    setLoading(true);
    let query = supabase
      .from("audits")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeSubAccountId) {
      query = query.eq("sub_account_id", activeSubAccountId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setAudits(data as AuditRow[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            {t("auditModule.list.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("auditModule.list.description")}
          </p>
        </div>
        <Button onClick={onNewAudit} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("auditModule.list.newAudit")}
        </Button>
      </div>

      {audits.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">
            {t("auditModule.list.empty")}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t("auditModule.list.emptyDescription")}
          </p>
          <Button onClick={onNewAudit} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("auditModule.list.newAudit")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <button
              key={audit.id}
              onClick={() => onViewAudit(audit)}
              className="w-full bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow text-left flex items-center gap-5"
            >
              <div className="shrink-0">
                {audit.score !== null ? (
                  <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">{audit.score}</span>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">
                  {audit.offer || audit.target_audience || t("auditModule.list.untitled")}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                  {audit.landing_page_url || audit.traffic_source}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(audit.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="shrink-0">
                {audit.score !== null ? (
                  <span className="text-sm font-medium text-primary">
                    {t("auditModule.list.viewResults")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("auditModule.list.pending")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditList;
