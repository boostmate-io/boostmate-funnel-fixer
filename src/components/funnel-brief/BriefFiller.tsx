import { useCallback } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BriefStructure, BriefValues, BriefField } from "./types";

interface BriefFillerProps {
  structure: BriefStructure;
  values: BriefValues;
  onChange: (values: BriefValues) => void;
  readOnly?: boolean;
}

const BriefFiller = ({ structure, values, onChange, readOnly }: BriefFillerProps) => {
  const setValue = useCallback((fieldId: string, value: any) => {
    onChange({ ...values, [fieldId]: value });
  }, [values, onChange]);

  // Progress calculation
  const allFields = structure.sections.flatMap((s) => s.fields);
  const requiredFields = allFields.filter((f) => f.required);
  const filledRequired = requiredFields.filter((f) => {
    const v = values[f.id];
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  const totalFields = allFields.length;
  const filledTotal = allFields.filter((f) => {
    const v = values[f.id];
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;
  const progressPercent = totalFields > 0 ? Math.round((filledTotal / totalFields) * 100) : 0;

  const renderField = (field: BriefField) => {
    const value = values[field.id];
    const fieldId = field.id;

    if (readOnly) {
      const displayValue = (() => {
        if (value === null || value === undefined || value === "") return null;
        if (field.fieldType === "checkbox") return value ? "Yes" : "No";
        if (Array.isArray(value)) return value.join(", ");
        return String(value);
      })();

      if (!displayValue) return <span className="text-xs text-muted-foreground italic">Not filled</span>;
      return <p className="text-sm text-foreground whitespace-pre-wrap">{displayValue}</p>;
    }

    switch (field.fieldType) {
      case "text":
        return (
          <Input
            value={String(value || "")}
            onChange={(e) => setValue(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className="h-8 text-sm"
          />
        );
      case "textarea":
        return (
          <Textarea
            value={String(value || "")}
            onChange={(e) => setValue(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className="text-sm min-h-[80px] resize-y"
          />
        );
      case "url":
        return (
          <Input
            type="url"
            value={String(value || "")}
            onChange={(e) => setValue(fieldId, e.target.value)}
            placeholder={field.placeholder || "https://..."}
            className="h-8 text-sm"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => setValue(fieldId, e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder}
            className="h-8 text-sm"
          />
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`brief-${fieldId}`}
              checked={!!value}
              onCheckedChange={(checked) => setValue(fieldId, !!checked)}
            />
            <label htmlFor={`brief-${fieldId}`} className="text-sm text-foreground cursor-pointer">
              {field.label}
            </label>
          </div>
        );
      case "dropdown":
        return (
          <Select value={String(value || "")} onValueChange={(v) => setValue(fieldId, v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiselect": {
        const selected = Array.isArray(value) ? value as string[] : [];
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {selected.map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive/20"
                  onClick={() => setValue(fieldId, selected.filter((x) => x !== s))}
                >
                  {s} ×
                </Badge>
              ))}
            </div>
            <Select onValueChange={(v) => { if (!selected.includes(v)) setValue(fieldId, [...selected, v]); }}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={field.placeholder || "Add option..."} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).filter((o) => !selected.includes(o)).map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
      case "file":
        return (
          <div className="text-xs text-muted-foreground italic border border-dashed border-border rounded-md p-3 text-center">
            File upload coming soon
          </div>
        );
      default:
        return null;
    }
  };

  if (structure.sections.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No brief structure configured yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Use the Builder tab to create your brief structure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Completion</span>
          <span className="font-semibold text-foreground">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {requiredFields.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {filledRequired.length === requiredFields.length
              ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              : <Circle className="w-3 h-3" />
            }
            <span>{filledRequired.length}/{requiredFields.length} required fields completed</span>
          </div>
        )}
      </div>

      {/* Sections */}
      {structure.sections.map((section) => (
        <div key={section.id} className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            {section.description && <p className="text-[11px] text-muted-foreground mt-0.5">{section.description}</p>}
          </div>
          <div className="p-3 space-y-3">
            {section.fields.map((field) => (
              <div key={field.id} className="space-y-1">
                {field.fieldType !== "checkbox" && (
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </label>
                )}
                {field.description && (
                  <p className="text-[10px] text-muted-foreground">{field.description}</p>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BriefFiller;
