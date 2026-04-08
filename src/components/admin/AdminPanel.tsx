import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Layers, ShieldCheck } from "lucide-react";
import AdminMainAccounts from "./AdminMainAccounts";
import AdminSubAccounts from "./AdminSubAccounts";
import AdminUsers from "./AdminUsers";

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
      </Tabs>
    </div>
  );
};

export default AdminPanel;
