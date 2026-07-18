import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import LanguageSwitcher from "@/components/dashboard/LanguageSwitcher";
import ProjectSettings from "@/components/dashboard/ProjectSettings";
import KnowledgeCenter from "@/components/dashboard/KnowledgeCenter";
import AuditModule from "@/components/audit/AuditModule";

import ClientManagement from "@/components/agency/ClientManagement";
import AgencySettings from "@/components/agency/AgencySettings";
import { BarChart3, GitBranch, FileText, TrendingUp, Sparkles } from "lucide-react";
import FunnelModule from "@/components/funnel-designer/FunnelModule";
import CopyDocumentsModule from "@/components/copy/CopyDocumentsModule";
import AnalyticsModule from "@/components/analytics/AnalyticsModule";
import DeleteAccountSection from "@/components/dashboard/DeleteAccountSection";
import AdminPanel from "@/components/admin/AdminPanel";
import OutreachModule from "@/components/outreach/OutreachModule";
import BusinessBlueprintModule from "@/components/business-blueprint/BusinessBlueprintModule";
import GlobalCoachBubble from "@/components/coach/GlobalCoachBubble";
import GrowthRoadmapOverview from "@/components/growth/GrowthRoadmapOverview";
import GrowthRoadmapModule from "@/components/growth/GrowthRoadmapModule";
import { usePendingGrowthClaim } from "@/hooks/usePendingGrowthClaim";

const Dashboard = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialModule = searchParams.get("module") || "overview";
  const [activeModule, setActiveModule] = useState(initialModule);
  const handleModuleChange = (next: string) => {
    const guard = (window as any).__funnelDirtyGuard as
      | ((proceed: () => void) => void)
      | undefined;
    if (guard) {
      guard(() => setActiveModule(next));
      return;
    }
    setActiveModule(next);
  };
  const { user } = useAuth();
  const { loading } = useWorkspace();

  // Allow deep-linking to a specific module from anywhere in the app
  // (used e.g. by the "Complete Blueprint" CTA in copy components).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") handleModuleChange(detail);
    };
    window.addEventListener("boostmate:navigate-module", handler);
    return () => window.removeEventListener("boostmate:navigate-module", handler);
  }, []);

  const fullHeightModules = ["funnels", "copy-documents", "funnel-audit", "analytics", "clients", "business-blueprint", "admin-accounts", "admin-ai", "admin-copy", "outreach", "growth-roadmap"];

  usePendingGrowthClaim();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-dashboard">
      
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
        <main className={`flex-1 overflow-auto ${fullHeightModules.includes(activeModule) ? "" : "p-8"}`}>
          {!fullHeightModules.includes(activeModule) && activeModule !== "overview" && (
            <div className="mb-8">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {activeModule === "settings" && t("dashboard.settings.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{t("dashboard.welcomeBack", { email: user?.email })}</p>
            </div>
          )}

          {activeModule === "overview" && (
            <GrowthRoadmapOverview
              onStartAssessment={() => setActiveModule("growth-roadmap")}
              onOpenModule={(m) => setActiveModule(m)}
            />
          )}

          {activeModule === "growth-roadmap" && (
            <GrowthRoadmapModule onOpenModule={(m) => setActiveModule(m)} />
          )}


          {activeModule === "clients" && <ClientManagement />}
          {activeModule === "outreach" && (
            <div className="h-full">
              <OutreachModule />
            </div>
          )}
          {activeModule === "funnel-audit" && <AuditModule />}
          {activeModule === "business-blueprint" && (
            <div className="h-full">
              <BusinessBlueprintModule />
            </div>
          )}
          {activeModule === "funnels" && (
            <div className="h-full">
              <FunnelModule onNavigateToOffer={() => setActiveModule("business-blueprint")} />
            </div>
          )}
          {activeModule === "analytics" && (
            <div className="h-full">
              <AnalyticsModule />
            </div>
          )}
          {activeModule === "copy-documents" && (
            <div className="h-full">
              <CopyDocumentsModule />
            </div>
          )}
          {activeModule === "admin-accounts" && (
            <div className="h-full">
              <AdminPanel category="accounts" />
            </div>
          )}
          {activeModule === "admin-ai" && (
            <div className="h-full">
              <AdminPanel category="ai" />
            </div>
          )}
          {activeModule === "admin-copy" && (
            <div className="h-full">
              <AdminPanel category="copy" />
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
      <GlobalCoachBubble />
    </div>
  );
};

export default Dashboard;
