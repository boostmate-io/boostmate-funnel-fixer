import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AuditResults from "./AuditResults";
import { AuditResult } from "@/types/audit";

interface AuditDetailProps {
  audit: {
    id: string;
    score: number | null;
    result: any;
    offer: string;
    created_at: string;
  };
  onBack: () => void;
}

const AuditDetail = ({ audit, onBack }: AuditDetailProps) => {
  const { t } = useTranslation();

  if (!audit.result || audit.score === null) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("auditModule.list.pending")}</p>
        <Button variant="ghost" onClick={onBack} className="gap-2 mt-4">
          <ArrowLeft className="w-4 h-4" /> {t("auditModule.backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-6">
        <ArrowLeft className="w-4 h-4" /> {t("auditModule.backToList")}
      </Button>
      <AuditResults result={audit.result as AuditResult} onCreateAccount={() => {}} showCta={false} />
    </div>
  );
};

export default AuditDetail;
