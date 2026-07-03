import { MessageSquare, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import type { FieldDef } from "./clarityConfig";
import ChipsField from "./fields/ChipsField";
import TagsField from "./fields/TagsField";

interface Props {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  onCoach: () => void;
}

const renderInput = (
  field: FieldDef,
  value: string,
  onChange: (v: string) => void,
) => {
  switch (field.type) {
    case "chips-single":
      return <ChipsField value={value} onChange={onChange} options={field.options || []} />;
    case "tags":
      return <TagsField value={value} onChange={onChange} placeholder={field.placeholder} />;
    case "textarea":
    default:
      return (
        <AutoTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 3}
          className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] leading-relaxed placeholder:text-muted-foreground/60"
        />
      );
  }
};

const FieldCard = ({ field, value, onChange, onCoach }: Props) => {
  const hasContent = value.trim().length > 0;

  return (
    <div className="group relative h-full rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all flex flex-col">
      <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Label className="text-lg font-display font-bold text-foreground leading-snug">
              {field.label}
            </Label>
            {hasContent && (
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-label="Filled" />
            )}
          </div>
          {field.helper && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{field.helper}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0"
          onClick={onCoach}
        >
          <MessageSquare className="w-3 h-3" />
          Coach
        </Button>
      </div>

      <div className="px-5 pt-2 pb-4 flex-1">
        {renderInput(field, value, onChange)}
      </div>
    </div>
  );
};

export default FieldCard;
