import { useCallback } from "react";
import { CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BriefStructure, BriefValues, BriefField, BriefApprovedFields } from "./types";

interface BriefFillerProps {
  structure: BriefStructure;
  values: BriefValues;
  onChange: (values: BriefValues) => void;
  readOnly?: boolean;
  approvedFields?: BriefApprovedFields;
  onApprovedFieldsChange?: (af: BriefApprovedFields) => void;
  canApprove?: boolean;
}

const BriefFiller = ({ structure, values, onChange, readOnly, approvedFields = {}, onApprovedFieldsChange, canApprove }: BriefFillerProps) => {
  const setValue = useCallback((fieldId: string, value: any) => {
    onChange({ ...values, [fieldId]: value });
  }, [values, onChange]);

  const toggleFieldApproval = useCallback((fieldId: string) => {
    if (!onApprovedFieldsChange) return;
    const newAf = { ...approvedFields, [fieldId]: !approvedFields[fieldId] };
    if (!newAf[fieldId]) delete newAf[fieldId];
    onApprovedFieldsChange(newAf);
  }, [approvedFields, onApprovedFieldsChange]);

  // Progress based on approved fields
  const allFields = structure.sections.flatMap((s) => s.fields);
  const totalFields = allFields.length;
  const approvedCount = allFields.filter((f) => approvedFields[f.id]).length;
  const progressPercent = totalFields > 0 ? Math.round((approvedCount / totalFields) * 100) : 0;

  const renderFieldValue = (field: BriefField) => {
    const value = values[field.id];
    const displayValue = (() => {
      if (value === null || value === undefined || value === "") return null;
      if (field.fieldType === "checkbox") return value ? "Yes" : "No";
      if (Array.isArray(value)) return value.join(", ");
      return String(value);
    })();

    if (!displayValue) return <span className="text-xs text-muted-foreground italic">Not filled</span>;
    return <p className="text-sm text-foreground whitespace-pre-wrap">{displayValue}</p>;
  };

  const renderField = (field: BriefField) => {
    const value = values[field.id];
    const fieldId = field.id;
    const isApproved = approvedFields[fieldId];

    // If field is approved, show read-only value with unapprove button
    if (isApproved) {
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1">{renderFieldValue(field)}</div>
          {canApprove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => toggleFieldApproval(fieldId)}
            >
              <RotateCcw className="w-3 h-3 mr-0.5" /> Unapprove
            </Button>
          )}
        </div>
      );
    }

    // If readOnly (and not approved context), just show value
    if (readOnly) {
      return renderFieldValue(field);
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
          <span className="text-muted-foreground font-medium">Approved</span>
          <span className="font-semibold text-foreground">{approvedCount}/{totalFields} fields ({progressPercent}%)</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 bg-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {structure.sections.map((section) => (
        <div key={section.id} className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            {section.description && <p className="text-[11px] text-muted-foreground mt-0.5">{section.description}</p>}
          </div>
          <div className="p-3 space-y-3">
            {section.fields.map((field) => {
              const isApproved = approvedFields[field.id];
              return (
                <div key={field.id} className={`space-y-1 p-2 rounded-md ${isApproved ? "bg-emerald-500/5 border border-emerald-500/20" : ""}`}>
                  <div className="flex items-center justify-between">
                    {field.fieldType !== "checkbox" && (
                      <label className="text-xs font-medium text-foreground flex items-center gap-1">
                        {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </label>
                    )}
                    {canApprove && !isApproved && !readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-emerald-600"
                        onClick={() => toggleFieldApproval(field.id)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Approve
                      </Button>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  )}
                  {renderField(field)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BriefFiller;
