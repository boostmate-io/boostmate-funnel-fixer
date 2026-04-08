import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const WorkspaceBanner = () => {
  const { t } = useTranslation();
  const { isAgency, activeSubAccount, subAccounts, switchSubAccount } = useWorkspace();

  // Show banner when viewing a non-default (client) workspace
  if (!isAgency || !activeSubAccount || activeSubAccount.is_default) return null;

  const defaultSub = subAccounts.find((s) => s.is_default);

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>{t("agency.viewingAs", { name: activeSubAccount.name })}</span>
      </div>
      {defaultSub && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => switchSubAccount(defaultSub.id)}
          className="h-7 text-xs"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          {t("agency.backToAgency")}
        </Button>
      )}
    </div>
  );
};

export default WorkspaceBanner;
