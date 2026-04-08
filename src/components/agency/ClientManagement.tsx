import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users } from "lucide-react";
import ClientAccountsView from "./ClientAccountsView";
import ClientUsersView from "./ClientUsersView";

const ClientManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("accounts");

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t("agency.clientsTitle")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("agency.clientsDescription")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <Building2 className="w-4 h-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <ClientAccountsView />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <ClientUsersView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientManagement;
