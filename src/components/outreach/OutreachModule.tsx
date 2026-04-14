import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, BarChart3, Settings, Kanban } from "lucide-react";
import OutreachLeadsList from "./OutreachLeadsList";
import OutreachPipeline from "./OutreachPipeline";
import OutreachDraftQueue from "./OutreachDraftQueue";
import OutreachAnalytics from "./OutreachAnalytics";
import OutreachSettings from "./OutreachSettings";

const OutreachModule = () => {
  const [activeTab, setActiveTab] = useState("leads");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-6 pt-4">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Outreach</h1>
          <TabsList className="bg-transparent border-none p-0 gap-1">
            <TabsTrigger value="leads" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <Users className="w-4 h-4" /> Leads
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <Kanban className="w-4 h-4" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="drafts" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <FileText className="w-4 h-4" /> Draft Queue
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <BarChart3 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <Settings className="w-4 h-4" /> Settings
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="leads" className="flex-1 overflow-auto mt-0 p-6">
          <OutreachLeadsList key={refreshKey} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="pipeline" className="flex-1 overflow-auto mt-0 p-6">
          <OutreachPipeline key={refreshKey} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="drafts" className="flex-1 overflow-auto mt-0 p-6">
          <OutreachDraftQueue key={refreshKey} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="analytics" className="flex-1 overflow-auto mt-0 p-6">
          <OutreachAnalytics key={refreshKey} />
        </TabsContent>
        <TabsContent value="settings" className="flex-1 overflow-auto mt-0 p-6">
          <OutreachSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OutreachModule;
