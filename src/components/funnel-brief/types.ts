export type BriefFieldType = "text" | "textarea" | "dropdown" | "multiselect" | "checkbox" | "url" | "number" | "file";

export interface BriefField {
  id: string;
  label: string;
  description?: string;
  fieldType: BriefFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: string[]; // for dropdown / multiselect
}

export interface BriefSection {
  id: string;
  title: string;
  description?: string;
  fields: BriefField[];
}

export interface BriefStructure {
  sections: BriefSection[];
}

export type BriefValues = Record<string, string | string[] | boolean | number | null>;

export interface FunnelBrief {
  id: string;
  funnel_id: string;
  user_id: string;
  share_token: string | null;
  share_permission: "view" | "edit";
  structure: BriefStructure;
  values: BriefValues;
  created_at: string;
  updated_at: string;
}

export const FIELD_TYPE_LABELS: Record<BriefFieldType, string> = {
  text: "Text Input",
  textarea: "Text Area",
  dropdown: "Dropdown",
  multiselect: "Multi Select",
  checkbox: "Checkbox",
  url: "URL Input",
  number: "Number Input",
  file: "File Upload",
};

export const createField = (partial?: Partial<BriefField>): BriefField => ({
  id: crypto.randomUUID(),
  label: "New Field",
  fieldType: "text",
  required: false,
  ...partial,
});

export const createSection = (partial?: Partial<BriefSection>): BriefSection => ({
  id: crypto.randomUUID(),
  title: "New Section",
  fields: [],
  ...partial,
});
