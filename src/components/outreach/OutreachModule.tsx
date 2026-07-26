import { useState } from "react";
import { Users, FileText, BarChart3, Settings, Kanban, Send } from "lucide-react";
import { PageHeader, PageTabs, PageBody } from "@/components/layout/PageLayout";
import OutreachLeadsList from "./OutreachLeadsList";
import OutreachPipeline from "./OutreachPipeline";
import OutreachDraftQueue from "./OutreachDraftQueue";
import OutreachAnalytics from "./OutreachAnalytics";
import OutreachSettings from "./OutreachSettings";

const TABS = [
  { id: "leads", label: "Leads", icon: Users },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "drafts", label: "Draft Queue", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const OutreachModule = () => {
  const [activeTab, setActiveTab] = useState("leads");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Outreach"
        subtitle="Find leads, draft personalized messages and track your pipeline."
        icon={Send}
      />
      <PageTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />
      <PageBody>
        {activeTab === "leads" && <OutreachLeadsList key={refreshKey} onRefresh={refresh} />}
        {activeTab === "pipeline" && <OutreachPipeline key={refreshKey} onRefresh={refresh} />}
        {activeTab === "drafts" && <OutreachDraftQueue key={refreshKey} onRefresh={refresh} />}
        {activeTab === "analytics" && <OutreachAnalytics key={refreshKey} />}
        {activeTab === "settings" && <OutreachSettings />}
      </PageBody>
    </div>
  );
};

export default OutreachModule;
