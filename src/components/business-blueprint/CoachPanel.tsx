import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
}

const CoachPanel = ({ open, onOpenChange, title, questions, onSubmit }: Props) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onSubmit(answers);
    setAnswers({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <SheetTitle className="text-xl">Coach Me — {title}</SheetTitle>
          </div>
          <SheetDescription>
            Answer a few quick questions. AI will turn your answers into structured field suggestions.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {questions.map((q, i) => (
            <div key={q} className="space-y-2">
              <Label className="text-sm font-semibold">
                <span className="text-primary mr-1">{i + 1}.</span>
                {q}
              </Label>
              <Textarea
                value={answers[q] || ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q]: e.target.value }))}
                placeholder="Type your answer…"
                className="min-h-[70px]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-8 sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 gap-2">
            <Sparkles className="w-4 h-4" />
            Generate Suggestions
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CoachPanel;
