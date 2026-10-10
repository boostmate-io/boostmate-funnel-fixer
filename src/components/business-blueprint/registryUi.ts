// =============================================================================
// Registry → UI bridge.
// Converts pure-data Blueprint Registry definitions into the shapes the
// Business Blueprint UI already consumes (icons, FieldDef).
// =============================================================================

import {
  AlertTriangle,
  ArrowRightLeft,
  Award,
  BookOpen,
  Compass,
  Euro,
  Eye,
  Layers,
  Mic,
  Network,
  Package,
  Palette,
  Sparkles,
  Star,
  Target,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  BLUEPRINT_LISTS,
  getBlueprintFieldByPath,
  getRegistrySubBlock,
  renderLabel,
  type LabelTokens,
  type RegistryField,
  type RegistrySubBlock,
} from "@shared/blueprintRegistry";

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle,
  ArrowRightLeft,
  Award,
  BookOpen,
  Compass,
  Euro,
  Eye,
  Layers,
  Mic,
  Network,
  Package,
  Palette,
  Sparkles,
  Star,
  Target,
  User,
  Users,
};

export function resolveIcon(iconKey: string): LucideIcon {
  return ICONS[iconKey] ?? Sparkles;
}

/** Registry field → the UI `FieldDef` shape, with label tokens applied. */
export function toFieldDef(field: RegistryField, tokens?: Partial<LabelTokens>) {
  return {
    key: field.key as any,
    label: field.labelTemplate ? renderLabel(field.labelTemplate, tokens) : field.label,
    helper: field.helper,
    placeholder: field.placeholder,
    type: field.kind,
    options: field.options,
    suggestions: field.suggestions,
    fullWidth: field.fullWidth,
    rows: field.rows,
    // Optional editor metadata — only present when the registry sets it.
    ...(field.valueType ? { valueType: field.valueType } : {}),
    ...(field.enumValues ? { enumValues: field.enumValues } : {}),
    ...(field.control ? { control: field.control } : {}),
    ...(field.editorOnly ? { editorOnly: true as const } : {}),
  };
}

export function subBlockFields(tabId: string, subBlockId: string, tokens?: Partial<LabelTokens>) {
  const sb = getRegistrySubBlock(tabId, subBlockId);
  return (sb?.fields ?? []).map((field) => toFieldDef(field, tokens));
}

export function subBlockOf(tabId: string, subBlockId: string): RegistrySubBlock | undefined {
  return getRegistrySubBlock(tabId, subBlockId);
}

/**
 * Offer Editor field copy resolved from the central registry: display copy
 * plus the exact AI Coach target (id = registry path). Throws for unknown
 * paths so a renamed registry field fails loudly in tests, not silently in UI.
 */
export function offerEditorField(path: string, tokens?: Partial<LabelTokens>) {
  const field = getBlueprintFieldByPath(path);
  if (!field) throw new Error(`Unknown registry field: ${path}`);
  const r = (s?: string) => (s == null ? undefined : renderLabel(s, tokens));
  const e = field.editor ?? {};
  const label = r(e.label) ?? field.label;
  return {
    path: field.path,
    label,
    helper: r(e.helper),
    placeholder: r(e.placeholder ?? field.placeholder),
    coach: {
      id: field.path,
      label: r(e.coach?.label) ?? label,
      helper: r(e.coach?.helper),
      placeholder: r(e.coach?.placeholder),
    },
  };
}
export type OfferEditorFieldCopy = ReturnType<typeof offerEditorField>;

/**
 * Offer Editor copy for a registry LIST (Offer Stack builders): card copy,
 * the exact list-Coach target, and per-item field copy + Coach targets.
 */
export function offerEditorList(basePath: string) {
  const list = BLUEPRINT_LISTS.find((l) => l.basePath === basePath);
  if (!list?.editor) throw new Error(`Unknown registry list: ${basePath}`);
  const e = list.editor;
  const items = [...list.itemFields, ...(list.editorItemFields ?? [])];
  const n = (s: string | undefined, idx: number) => s?.replace(/\{n\}/g, String(idx + 1));
  const itemField = (key: string) => {
    const f = items.find((i) => i.key === key);
    if (!f) throw new Error(`Unknown list item field: ${basePath}.${key}`);
    return f;
  };
  return {
    basePath,
    title: e.title ?? list.label,
    description: e.description,
    addLabel: e.addLabel,
    emptyText: e.emptyText,
    fallbackTitle: (idx: number) => n(e.itemFallbackTitle, idx) ?? `${list.itemLabel} ${idx + 1}`,
    listCoach: {
      id: e.coach?.id ?? basePath,
      label: e.coach?.label ?? list.label,
      helper: e.coach?.helper,
      basePath,
      itemFields: e.coachItemFields ?? list.itemFields.map(({ key, label, kind, helper }) => ({ key, label, kind, helper })),
      suggestedCount: list.suggestedCount,
    },
    /** Display copy for one item field. */
    item: (key: string) => {
      const f = itemField(key);
      return { label: f.editor?.label ?? f.label, placeholder: f.editor?.placeholder };
    },
    /** Exact Coach target for one item field of one list item (by item id). */
    itemCoach: (key: string, itemId: string, idx: number) => {
      const f = itemField(key);
      const c = f.editor?.coach ?? {};
      return {
        id: `${basePath}.${itemId}.${key}`,
        label: n(c.label, idx) ?? `${list.itemLabel} ${idx + 1} — ${f.label}`,
        helper: c.helper,
        ...(c.placeholder ? { placeholder: c.placeholder } : {}),
      };
    },
  };
}
