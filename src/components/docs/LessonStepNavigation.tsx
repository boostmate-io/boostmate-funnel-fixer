import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LessonStepNavigation = ({ step, count, complete, onStep, onToggle }: {
  step: number; count: number; complete: boolean; onStep: (n: number) => void; onToggle: () => void;
}) => (
  <div className="mt-10 border-t pt-6 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">Step {step} of {count}</p>
      <Button variant={complete ? "outline" : "default"} onClick={onToggle} aria-pressed={complete} className="gap-2">
        {complete && <Check className="h-4 w-4" />}{complete ? "Mark as Incomplete" : "Mark as Complete"}
      </Button>
    </div>
    <div className="flex justify-between gap-3">
      <Button variant="outline" disabled={step === 1} onClick={() => onStep(step - 1)} className="gap-2"><ArrowLeft className="h-4 w-4" />Previous</Button>
      <Button variant="outline" disabled={step === count} onClick={() => onStep(step + 1)} className="gap-2">Next Step<ArrowRight className="h-4 w-4" /></Button>
    </div>
  </div>
);