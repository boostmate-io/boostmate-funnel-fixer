import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import LanguageSwitcher from "@/components/dashboard/LanguageSwitcher";
import { BarChart3, PenTool } from "lucide-react";
import FunnelDesigner from "@/components/funnel-designer/FunnelDesigner";

const Dashboard = () => {
  const { t } = useTranslation();
  const [activeModule, setActiveModule] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background-dashboard">
      <DashboardSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {activeModule === "overview" && t("dashboard.title")}
            {activeModule === "funnel-audit" && t("dashboard.sidebar.funnelAudit")}
            {activeModule === "settings" && t("dashboard.settings.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("dashboard.welcomeBack", { email: user.email })}</p>
        </div>

        {activeModule === "overview" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button onClick={() => setActiveModule("funnel-audit")} className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">{t("dashboard.funnelAudit.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.funnelAudit.description")}</p>
            </button>
          </div>
        )}

        {activeModule === "funnel-audit" && (
          <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-bold text-foreground mb-2">{t("dashboard.funnelAudit.placeholder")}</h3>
            <p className="text-muted-foreground">{t("dashboard.funnelAudit.placeholderDescription")}</p>
          </div>
        )}

        {activeModule === "settings" && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-6">
            <div>
              <h3 className="font-display font-bold text-foreground mb-2">{t("dashboard.settings.account")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.settings.email")}: {user.email}</p>
            </div>
            <div className="border-t border-border pt-6">
              <LanguageSwitcher />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
