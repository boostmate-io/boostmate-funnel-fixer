import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Users } from "lucide-react";
import { PageHeader, PageTabs, PageBody } from "@/components/layout/PageLayout";
import ClientAccountsView from "./ClientAccountsView";
import ClientUsersView from "./ClientUsersView";

const TABS = [
  { id: "accounts", label: "Accounts", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
];

const ClientManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("accounts");

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t("agency.clientsTitle")}
        subtitle={t("agency.clientsDescription")}
        icon={Users}
      />
      <PageTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />
      <PageBody>
        {activeTab === "accounts" && <ClientAccountsView />}
        {activeTab === "users" && <ClientUsersView />}
      </PageBody>
    </div>
  );
};

export default ClientManagement;
