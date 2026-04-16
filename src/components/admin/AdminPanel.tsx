import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Layers, ShieldCheck, Zap, BookOpen } from "lucide-react";
import AdminMainAccounts from "./AdminMainAccounts";
import AdminSubAccounts from "./AdminSubAccounts";
import AdminUsers from "./AdminUsers";
import AdminAIActions from "./AdminAIActions";
import AdminInstructionBlocks from "./AdminInstructionBlocks";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("main-accounts");

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Platform Admin
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage all accounts, workspaces, and users across the platform.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="main-accounts" className="gap-2">
            <Building2 className="w-4 h-4" />
            Main Accounts
          </TabsTrigger>
          <TabsTrigger value="sub-accounts" className="gap-2">
            <Layers className="w-4 h-4" />
            Sub Accounts
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="ai-actions" className="gap-2">
            <Zap className="w-4 h-4" />
            AI Actions
          </TabsTrigger>
          <TabsTrigger value="instruction-blocks" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Instruction Blocks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main-accounts">
          <AdminMainAccounts />
        </TabsContent>
        <TabsContent value="sub-accounts">
          <AdminSubAccounts />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="ai-actions">
          <AdminAIActions />
        </TabsContent>
        <TabsContent value="instruction-blocks">
          <AdminInstructionBlocks />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
