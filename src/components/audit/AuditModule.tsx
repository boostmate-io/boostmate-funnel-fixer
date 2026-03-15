import { useState } from "react";
import { useTranslation } from "react-i18next";
import AuditList from "./AuditList";
import AuditDetail from "./AuditDetail";
import DashboardAuditWizard from "./DashboardAuditWizard";

type AuditView = "list" | "new" | "detail";

const AuditModule = () => {
  const [view, setView] = useState<AuditView>("list");
  const [selectedAudit, setSelectedAudit] = useState<any>(null);

  return (
    <div className="p-8">
      {view === "list" && (
        <AuditList
          onNewAudit={() => setView("new")}
          onViewAudit={(audit) => {
            setSelectedAudit(audit);
            setView("detail");
          }}
        />
      )}

      {view === "new" && (
        <DashboardAuditWizard
          onBack={() => setView("list")}
          onComplete={() => setView("list")}
        />
      )}

      {view === "detail" && selectedAudit && (
        <AuditDetail
          audit={selectedAudit}
          onBack={() => {
            setSelectedAudit(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
};

export default AuditModule;
