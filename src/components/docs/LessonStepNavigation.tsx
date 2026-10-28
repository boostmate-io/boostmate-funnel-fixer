import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface NextLessonLink {
  href: string;
  title: string;
}

// On the final step the forward action becomes a link to the next lesson in the course.
export const LessonStepNavigation = ({ step, count, complete, onStep, onToggle, next }: {
  step: number; count: number; complete: boolean; onStep: (n: number) => void; onToggle: () => void;
  next?: NextLessonLink | null;
}) => (
  <div className="mt-10 border-t pt-6 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">Step {step} of {count}</p>
      <Button variant={complete ? "outline" : "default"} onClick={onToggle} aria-pressed={complete} className="gap-2">
        {complete && <Check className="h-4 w-4" />}{complete ? "Mark as Incomplete" : "Mark as Complete"}
      </Button>
    </div>
    <div className="flex flex-wrap justify-between items-center gap-3">
      <Button variant="outline" disabled={step === 1} onClick={() => onStep(step - 1)} className="gap-2"><ArrowLeft className="h-4 w-4" />Previous</Button>
      {step < count ? (
        <Button variant="outline" onClick={() => onStep(step + 1)} className="gap-2">Next Step<ArrowRight className="h-4 w-4" /></Button>
      ) : next ? (
        <Button asChild className="gap-2">
          <Link to={next.href}>Go to {next.title}<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      ) : null}
    </div>
  </div>
);
