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
