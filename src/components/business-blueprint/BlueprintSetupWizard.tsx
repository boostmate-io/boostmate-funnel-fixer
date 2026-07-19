import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { BUSINESS_TYPE_LIST, type BusinessTypeId } from "./businessTypes";
import type { WorkspaceSettingsPatch } from "./useWorkspaceSettings";

interface InitialValues {
  business_type?: string;
  // legacy fields — accepted for backwards compatibility, no longer collected
  help_achieve?: string;
  who_help?: string;
  main_goal?: string;
  biggest_challenge?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (patch: WorkspaceSettingsPatch) => void;
  onSkip: () => void;
  initialValues?: InitialValues;
  isEdit?: boolean;
}

const BlueprintSetupWizard = ({ open, onOpenChange, onComplete, onSkip, initialValues, isEdit }: Props) => {
  const [businessType, setBusinessType] = useState<BusinessTypeId>(
    (initialValues?.business_type as BusinessTypeId) || "coach"
  );

  useEffect(() => {
    if (open) {
      setBusinessType((initialValues?.business_type as BusinessTypeId) || "coach");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canFinish = !!businessType;

  const handleFinish = () => {
    onComplete({
      business_type: businessType,
      setup_status: "completed",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display">
                {isEdit ? "Edit your business type" : "Let's personalize your Blueprint"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Change your business type — it tailors examples, AI suggestions, and templates."
                  : "Takes 10 seconds — pick the option that fits best. You can fine-tune everything else inside the Blueprint."}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 min-h-[260px]">
          <h3 className="font-semibold text-foreground mb-1">What best describes your business?</h3>
          <p className="text-sm text-muted-foreground mb-4">We use this to adapt vocabulary and examples.</p>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPE_LIST.map((bt) => {
              const Icon = bt.icon;
              const isActive = businessType === bt.id;
              return (
                <button
                  key={bt.id}
                  onClick={() => setBusinessType(bt.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold text-sm text-foreground">{bt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{bt.shortDescription}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            {isEdit ? "Cancel" : "Skip for now"}
          </Button>
          <Button size="sm" onClick={handleFinish} disabled={!canFinish} className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            {isEdit ? "Save changes" : "Finish setup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintSetupWizard;
