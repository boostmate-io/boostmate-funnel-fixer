import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import LanguageSwitcher from "@/components/dashboard/LanguageSwitcher";
import ProjectSettings from "@/components/dashboard/ProjectSettings";
import KnowledgeCenter from "@/components/dashboard/KnowledgeCenter";
import AuditModule from "@/components/audit/AuditModule";
import ImpersonationBanner from "@/components/agency/ImpersonationBanner";
import ClientManagement from "@/components/agency/ClientManagement";
import AgencySettings from "@/components/agency/AgencySettings";
import { BarChart3, PenTool, Library, TrendingUp, Gem } from "lucide-react";
import FunnelDesigner from "@/components/funnel-designer/FunnelDesigner";
import AssetsLibrary from "@/components/assets/AssetsLibrary";
import AnalyticsModule from "@/components/analytics/AnalyticsModule";
import DeleteAccountSection from "@/components/dashboard/DeleteAccountSection";
import OfferModule from "@/components/offers/OfferModule";

const Dashboard = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialModule = searchParams.get("module") || "overview";
  const [activeModule, setActiveModule] = useState(initialModule);
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-background-dashboard">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        <main className={`flex-1 overflow-auto ${activeModule === "funnel-designer" || activeModule === "assets-library" || activeModule === "funnel-audit" || activeModule === "analytics" || activeModule === "clients" || activeModule === "offers" ? "" : "p-8"}`}>
          {activeModule !== "funnel-designer" && activeModule !== "assets-library" && activeModule !== "funnel-audit" && activeModule !== "analytics" && activeModule !== "clients" && activeModule !== "offers" && (
            <div className="mb-8">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {activeModule === "overview" && t("dashboard.title")}
                {activeModule === "settings" && t("dashboard.settings.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{t("dashboard.welcomeBack", { email: user?.email })}</p>
            </div>
          )}

          {activeModule === "overview" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button onClick={() => setActiveModule("funnel-audit")} className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">{t("dashboard.funnelAudit.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard.funnelAudit.description")}</p>
              </button>
              <button onClick={() => setActiveModule("funnel-designer")} className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <PenTool className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">{t("dashboard.funnelDesigner.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard.funnelDesigner.description")}</p>
              </button>
              <button onClick={() => setActiveModule("analytics")} className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">{t("dashboard.analytics.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard.analytics.description")}</p>
              </button>
              <button onClick={() => setActiveModule("offers")} className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <Gem className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">Offers</h3>
                <p className="text-sm text-muted-foreground">Create and manage strategic offers for your funnels.</p>
              </button>
              <button onClick={() => setActiveModule("assets-library")} className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <Library className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">{t("dashboard.assetsLibrary.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard.assetsLibrary.description")}</p>
              </button>
            </div>
          )}

          {activeModule === "clients" && <ClientManagement />}
          {activeModule === "funnel-audit" && <AuditModule />}
          {activeModule === "funnel-designer" && (
            <div className="h-full">
              <FunnelDesigner onNavigateToOffer={(id) => { setActiveModule("offers"); }} />
            </div>
          )}
          {activeModule === "offers" && (
            <div className="h-full">
              <OfferModule />
            </div>
          )}
          {activeModule === "analytics" && (
            <div className="h-full">
              <AnalyticsModule />
            </div>
          )}
          {activeModule === "assets-library" && (
            <div className="h-full">
              <AssetsLibrary />
            </div>
          )}
          {activeModule === "settings" && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <ProjectSettings />
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-6">
                <div>
                  <h3 className="font-display font-bold text-foreground mb-2">{t("dashboard.settings.account")}</h3>
                  <p className="text-sm text-muted-foreground">{t("dashboard.settings.email")}: {user?.email}</p>
                </div>
                <div className="border-t border-border pt-6">
                  <LanguageSwitcher />
                </div>
              </div>
              <AgencySettings />
              <KnowledgeCenter />
              <DeleteAccountSection />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
