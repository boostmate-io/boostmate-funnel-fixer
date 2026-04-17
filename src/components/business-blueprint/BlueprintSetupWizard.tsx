import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { BUSINESS_TYPE_LIST, type BusinessTypeId } from "./businessTypes";
import type { WorkspaceSettingsPatch } from "./useWorkspaceSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (patch: WorkspaceSettingsPatch) => void;
  onSkip: () => void;
}

const GOALS = [
  { value: "more-leads", label: "More leads" },
  { value: "more-sales", label: "More sales" },
  { value: "build-funnel", label: "Build a funnel" },
  { value: "improve-conversion", label: "Improve conversion" },
  { value: "clarify-offer", label: "Clarify my offer" },
  { value: "launch", label: "Launch something new" },
];

const BlueprintSetupWizard = ({ open, onOpenChange, onComplete, onSkip }: Props) => {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<BusinessTypeId>("coach");
  const [helpAchieve, setHelpAchieve] = useState("");
  const [whoHelp, setWhoHelp] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");

  const totalSteps = 5;
  const canNext = (() => {
    switch (step) {
      case 0: return !!businessType;
      case 1: return helpAchieve.trim().length > 2;
      case 2: return whoHelp.trim().length > 2;
      case 3: return !!mainGoal;
      case 4: return biggestChallenge.trim().length > 2;
      default: return false;
    }
  })();

  const handleFinish = () => {
    onComplete({
      business_type: businessType,
      help_achieve: helpAchieve.trim(),
      who_help: whoHelp.trim(),
      main_goal: mainGoal,
      biggest_challenge: biggestChallenge.trim(),
      setup_status: "completed",
    });
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Premium header */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display">Let's personalize your Blueprint</DialogTitle>
              <DialogDescription className="text-xs">
                2 minutes — answers tailor every example, AI suggestion, and template to your business.
              </DialogDescription>
            </div>
          </div>
          {/* Step pips */}
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 min-h-[260px]">
          {step === 0 && (
            <div>
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
          )}

          {step === 1 && (
            <div>
              <h3 className="font-semibold text-foreground mb-1">What do you help people achieve?</h3>
              <p className="text-sm text-muted-foreground mb-4">One sentence is enough.</p>
              <Textarea
                value={helpAchieve}
                onChange={(e) => setHelpAchieve(e.target.value)}
                placeholder="Example: I help fitness coaches build a predictable lead system so they sign 5 new clients/month."
                rows={4}
                className="resize-none"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-semibold text-foreground mb-1">Who do you help?</h3>
              <p className="text-sm text-muted-foreground mb-4">Be as specific as possible — niche, level, situation.</p>
              <Textarea
                value={whoHelp}
                onChange={(e) => setWhoHelp(e.target.value)}
                placeholder="Example: Solo fitness coaches doing €3–8k/month who rely on referrals."
                rows={4}
                className="resize-none"
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-semibold text-foreground mb-1">What is your main goal right now?</h3>
              <p className="text-sm text-muted-foreground mb-4">Pick the one that matters most this quarter.</p>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => {
                  const isActive = mainGoal === g.value;
                  return (
                    <button
                      key={g.value}
                      onClick={() => setMainGoal(g.value)}
                      className={`rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border text-foreground hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-semibold text-foreground mb-1">What is your biggest challenge right now?</h3>
              <p className="text-sm text-muted-foreground mb-4">We'll use this to surface the right suggestions.</p>
              <Textarea
                value={biggestChallenge}
                onChange={(e) => setBiggestChallenge(e.target.value)}
                placeholder="Example: I get clicks but no conversions on my landing page."
                rows={4}
                className="resize-none"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip for now
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {step < totalSteps - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="gap-1.5"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} disabled={!canNext} className="gap-1.5">
                <Sparkles className="w-4 h-4" />
                Finish setup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintSetupWizard;
