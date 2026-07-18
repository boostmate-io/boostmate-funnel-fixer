import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { QUESTIONS, type GrowthQuestion } from "@/lib/growth/questions";
import type { AnswerMap, ScoreValue } from "@/lib/growth/types";

interface Props {
  initialAnswers?: AnswerMap;
  submitting?: boolean;
  onSubmit: (answers: AnswerMap) => void;
}

export default function AssessmentWizard({ initialAnswers, submitting, onSubmit }: Props) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers ?? {});
  const [index, setIndex] = useState(0);

  const q = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;
  const total = QUESTIONS.length;

  const rawValue = (answers as Record<string, unknown>)[q.id];
  const canProceed = useMemo(() => {
    if (q.kind === "multi_select") return Array.isArray(rawValue) && rawValue.length > 0;
    return rawValue !== undefined && rawValue !== null && rawValue !== "";
  }, [rawValue, q.kind]);

  const setValue = (val: unknown) => setAnswers(prev => ({ ...prev, [q.id]: val as never }));

  const toggleMulti = (val: string) => {
    const arr = Array.isArray(rawValue) ? [...(rawValue as string[])] : [];
    const i = arr.indexOf(val);
    if (i >= 0) arr.splice(i, 1); else arr.push(val);
    setValue(arr);
  };

  const handleNext = () => {
    if (isLast) onSubmit(answers);
    else setIndex(i => i + 1);
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>{index + 1} / {total}</span>
          <span className="capitalize">{q.stage}</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-6">
        {t(q.labelKey)}
      </h2>

      <div className="space-y-3">
        {q.options.map(opt => {
          const isSelected =
            q.kind === "multi_select"
              ? Array.isArray(rawValue) && (rawValue as string[]).includes(opt.value)
              : (q.kind === "scored"
                  ? String(rawValue) === opt.value
                  : rawValue === opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (q.kind === "multi_select") toggleMulti(opt.value);
                else if (q.kind === "scored") setValue(Number(opt.value) as ScoreValue);
                else setValue(opt.value);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card hover:bg-muted/40 text-foreground"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0 || submitting}
        >
          {t("growth.back")}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed || submitting}>
          {isLast ? t("growth.submit") : t("growth.continue")}
        </Button>
      </div>
    </div>
  );
}
