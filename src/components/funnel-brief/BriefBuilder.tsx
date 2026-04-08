import { useState, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Settings2,
  Type, AlignLeft, ListFilter, CheckSquare, Link2, Hash, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BriefStructure, BriefSection, BriefField, BriefFieldType,
  FIELD_TYPE_LABELS, createField, createSection,
} from "./types";

const FIELD_TYPE_ICONS: Record<BriefFieldType, typeof Type> = {
  text: Type, textarea: AlignLeft, dropdown: ListFilter,
  multiselect: ListFilter, checkbox: CheckSquare, url: Link2,
  number: Hash, file: Upload,
};

interface BriefBuilderProps {
  structure: BriefStructure;
  onChange: (structure: BriefStructure) => void;
  readOnly?: boolean;
}

const BriefBuilder = ({ structure, onChange, readOnly }: BriefBuilderProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<{ type: "section" | "field"; sectionId: string; fieldId?: string } | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateSections = useCallback((fn: (sections: BriefSection[]) => BriefSection[]) => {
    onChange({ ...structure, sections: fn([...structure.sections]) });
  }, [structure, onChange]);

  const addSection = () => {
    const section = createSection();
    updateSections((s) => [...s, section]);
    setExpandedSections((prev) => new Set(prev).add(section.id));
  };

  const removeSection = (id: string) => {
    updateSections((s) => s.filter((sec) => sec.id !== id));
  };

  const updateSection = (id: string, updates: Partial<BriefSection>) => {
    updateSections((s) => s.map((sec) => sec.id === id ? { ...sec, ...updates } : sec));
  };

  const addField = (sectionId: string) => {
    const field = createField();
    updateSections((s) => s.map((sec) =>
      sec.id === sectionId ? { ...sec, fields: [...sec.fields, field] } : sec
    ));
    setEditingFieldId(field.id);
  };

  const removeField = (sectionId: string, fieldId: string) => {
    updateSections((s) => s.map((sec) =>
      sec.id === sectionId ? { ...sec, fields: sec.fields.filter((f) => f.id !== fieldId) } : sec
    ));
    if (editingFieldId === fieldId) setEditingFieldId(null);
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<BriefField>) => {
    updateSections((s) => s.map((sec) =>
      sec.id === sectionId
        ? { ...sec, fields: sec.fields.map((f) => f.id === fieldId ? { ...f, ...updates } : f) }
        : sec
    ));
  };

  // Drag & drop for sections
  const onSectionDragStart = (sectionId: string) => {
    setDragItem({ type: "section", sectionId });
  };

  const onSectionDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragItem || dragItem.type !== "section" || dragItem.sectionId === targetId) return;
    updateSections((s) => {
      const from = s.findIndex((sec) => sec.id === dragItem.sectionId);
      const to = s.findIndex((sec) => sec.id === targetId);
      if (from === -1 || to === -1) return s;
      const item = s[from];
      const next = [...s];
      next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragItem({ ...dragItem, sectionId: dragItem.sectionId });
  };

  // Drag & drop for fields within a section
  const onFieldDragStart = (sectionId: string, fieldId: string) => {
    setDragItem({ type: "field", sectionId, fieldId });
  };

  const onFieldDragOver = (e: React.DragEvent, sectionId: string, targetFieldId: string) => {
    e.preventDefault();
    if (!dragItem || dragItem.type !== "field" || !dragItem.fieldId) return;
    if (dragItem.sectionId !== sectionId || dragItem.fieldId === targetFieldId) return;
    updateSections((s) => s.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const from = sec.fields.findIndex((f) => f.id === dragItem.fieldId);
      const to = sec.fields.findIndex((f) => f.id === targetFieldId);
      if (from === -1 || to === -1) return sec;
      const fields = [...sec.fields];
      const item = fields[from];
      fields.splice(from, 1);
      fields.splice(to, 0, item);
      return { ...sec, fields };
    }));
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        {structure.sections.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No brief structure configured.</p>
        )}
        {structure.sections.map((section) => (
          <div key={section.id} className="border border-border rounded-lg p-3">
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            {section.description && <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>}
            <div className="mt-2 space-y-1">
              {section.fields.map((field) => {
                const Icon = FIELD_TYPE_ICONS[field.fieldType];
                return (
                  <div key={field.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="w-3 h-3 shrink-0" />
                    <span>{field.label}</span>
                    {field.required && <span className="text-destructive text-[10px]">*</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {structure.sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);

        return (
          <div
            key={section.id}
            className="border border-border rounded-lg bg-card overflow-hidden"
            draggable
            onDragStart={() => onSectionDragStart(section.id)}
            onDragOver={(e) => onSectionDragOver(e, section.id)}
            onDragEnd={() => setDragItem(null)}
          >
            {/* Section header */}
            <div className="flex items-center gap-2 p-3 bg-muted/30 border-b border-border">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <button onClick={() => toggleSection(section.id)} className="shrink-0">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <Input
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                className="h-7 text-sm font-semibold flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
                placeholder="Section title..."
              />
              <span className="text-[10px] text-muted-foreground shrink-0">{section.fields.length} fields</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSection(section.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>

            {isExpanded && (
              <div className="p-3 space-y-2">
                {/* Section description */}
                <Input
                  value={section.description || ""}
                  onChange={(e) => updateSection(section.id, { description: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="Section description (optional)..."
                />

                {/* Fields */}
                {section.fields.map((field) => {
                  const Icon = FIELD_TYPE_ICONS[field.fieldType];
                  const isEditing = editingFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      className={`border rounded-md transition-colors ${isEditing ? "border-primary bg-primary/5" : "border-border"}`}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); onFieldDragStart(section.id, field.id); }}
                      onDragOver={(e) => onFieldDragOver(e, section.id, field.id)}
                      onDragEnd={() => setDragItem(null)}
                    >
                      {/* Field row */}
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab shrink-0" />
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground flex-1 truncate">{field.label}</span>
                        {field.required && <span className="text-[9px] font-semibold text-destructive shrink-0">REQ</span>}
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                          onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                        >
                          <Settings2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeField(section.id, field.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>

                      {/* Field config panel */}
                      {isEditing && (
                        <div className="px-3 pb-3 pt-1 border-t border-border space-y-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Label</label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Description / Helper</label>
                            <Input
                              value={field.description || ""}
                              onChange={(e) => updateField(section.id, field.id, { description: e.target.value })}
                              className="h-7 text-xs"
                              placeholder="Explain what this field is for..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Field Type</label>
                              <Select
                                value={field.fieldType}
                                onValueChange={(v) => updateField(section.id, field.id, { fieldType: v as BriefFieldType })}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Placeholder</label>
                              <Input
                                value={field.placeholder || ""}
                                onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>

                          {/* Options for dropdown/multiselect */}
                          {(field.fieldType === "dropdown" || field.fieldType === "multiselect") && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Options (one per line)</label>
                              <Textarea
                                value={(field.options || []).join("\n")}
                                onChange={(e) => updateField(section.id, field.id, {
                                  options: e.target.value.split("\n").filter((l) => l.trim()),
                                })}
                                className="text-xs min-h-[60px]"
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Default Value</label>
                            <Input
                              value={field.defaultValue || ""}
                              onChange={(e) => updateField(section.id, field.id, { defaultValue: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`req-${field.id}`}
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(section.id, field.id, { required: !!checked })}
                            />
                            <label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground cursor-pointer">Required field</label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => addField(section.id)}>
                  <Plus className="w-3 h-3 mr-1" /> Add Field
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="w-full" onClick={addSection}>
        <Plus className="w-4 h-4 mr-1" /> Add Section
      </Button>
    </div>
  );
};

export default BriefBuilder;
