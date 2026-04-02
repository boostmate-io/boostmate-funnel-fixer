import { useTranslation } from "react-i18next";
import { useAgency } from "@/contexts/AgencyContext";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const ImpersonationBanner = () => {
  const { t } = useTranslation();
  const { impersonatedName, stopImpersonation } = useAgency();

  if (!impersonatedName) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>{t("agency.viewingAs", { name: impersonatedName })}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={stopImpersonation}
        className="h-7 text-xs"
      >
        <ArrowLeft className="w-3 h-3 mr-1" />
        {t("agency.backToAgency")}
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
