import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AgencySettings = () => {
  const { t } = useTranslation();
  const { isAgency, mainAccount } = useWorkspace();

  if (isAgency) return null;

  const handleUpgrade = async () => {
    if (!mainAccount) return;
    const { error } = await supabase
      .from("main_accounts")
      .update({ type: "agency" as any })
      .eq("id", mainAccount.id);
    if (!error) {
      toast.success(t("agency.upgraded"));
      // Reload to pick up changes
      window.location.reload();
    }
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
