import { useTranslation } from "react-i18next";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

const AgencySettings = () => {
  const { t } = useTranslation();
  const { isAgency, upgradeToAgency } = useAgency();

  if (isAgency) return null;

  const handleUpgrade = async () => {
    await upgradeToAgency();
    toast.success(t("agency.upgraded"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {t("agency.upgradeTitle")}
        </CardTitle>
        <CardDescription>{t("agency.upgradeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleUpgrade}>
          {t("agency.upgradeButton")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencySettings;
