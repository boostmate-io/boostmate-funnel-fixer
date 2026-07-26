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
  };
}

export function subBlockFields(tabId: string, subBlockId: string, tokens?: Partial<LabelTokens>) {
  const sb = getRegistrySubBlock(tabId, subBlockId);
  return (sb?.fields ?? []).map((field) => toFieldDef(field, tokens));
}

export function subBlockOf(tabId: string, subBlockId: string): RegistrySubBlock | undefined {
  return getRegistrySubBlock(tabId, subBlockId);
}
