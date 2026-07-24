// =============================================================================
// Brand Strategy — tab + field configuration.
// Mirrors the Customer Clarity pattern (clarityConfig.ts).
// Every field is Coach-ready via `FieldCard` (field-scope Coach).
// =============================================================================

import { Compass, Mic, Eye, Sparkles, type LucideIcon } from "lucide-react";
import type { FieldDef } from "./clarityConfig";

export type BrandTabId = "positioning" | "voice" | "visual" | "foundation";

export interface BrandFieldDef extends Omit<FieldDef, "key"> {
  key: string; // brand_strategy leaf keys (flat)
}

export interface BrandTabConfig {
  id: BrandTabId;
  label: string;
  icon: LucideIcon;
  description: string;
  fields: BrandFieldDef[];
}

export const BRAND_STRATEGY_TABS: BrandTabConfig[] = [
  {
    id: "positioning",
    label: "Positioning",
    icon: Compass,
    description: "How your business should be positioned in the market.",
    fields: [
      {
        key: "positioning_statement",
        label: "Positioning Statement",
        helper: "The one-line strategic claim your business owns. Template: For {audience}, we are the {category} that {differentiator}, so they can {outcome}.",
        placeholder: "For B2B coaches, we are the growth OS that operationalizes the whole business — so they can scale without burnout.",
        type: "textarea",
        rows: 3,
        fullWidth: true,
      },
      {
        key: "positioning_promise",
        label: "Core Promise",
        helper: "The transformation you consistently deliver, in one sentence.",
        placeholder: "We turn scattered coaching businesses into predictable, repeatable growth engines.",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
      {
        key: "positioning_differentiators",
        label: "Key Differentiators",
        helper: "What makes you clearly different from every alternative. Short lines or comma-separated.",
        placeholder: "Built by operators · Roadmap-driven · Coach-in-the-loop",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
    ],
  },
  {
    id: "voice",
    label: "Brand Voice",
    icon: Mic,
    description: "How your brand should communicate.",
    fields: [
      {
        key: "voice_tone",
        label: "Tone",
        helper: "A few adjectives that describe how your brand sounds.",
        placeholder: "Direct · warm · expert · no fluff",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
      {
        key: "voice_do",
        label: "We Do",
        helper: "Voice moves you always make.",
        placeholder: "Speak plainly. Show numbers. Address objections head-on.",
        type: "textarea",
        rows: 3,
        fullWidth: true,
      },
      {
        key: "voice_dont",
        label: "We Don't",
        helper: "Voice moves you never make.",
        placeholder: "Hype. Empty jargon. Fake scarcity.",
        type: "textarea",
        rows: 3,
        fullWidth: true,
      },
    ],
  },
  {
    id: "visual",
    label: "Visual Direction",
    icon: Eye,
    description: "Enough visual direction for consistent identity across assets.",
    fields: [
      {
        key: "visual_style",
        label: "Visual Style",
        helper: "How your brand looks — overall style and feel.",
        placeholder: "Clean · modern · confident. Generous whitespace. Bold display type.",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
      {
        key: "visual_colors",
        label: "Brand Colors",
        helper: "Primary + accents. Hex values or plain names.",
        placeholder: "#6246ff · off-white · charcoal",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
      {
        key: "visual_references",
        label: "Visual Inspiration",
        helper: "Brands, links or short descriptions that capture the aesthetic.",
        placeholder: "Linear · Attio · Framer. Product-first, no stock photography.",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
    ],
  },
  {
    id: "foundation",
    label: "Brand Foundation",
    icon: Sparkles,
    description: "Basic brand identity.",
    fields: [
      {
        key: "brand_name",
        label: "Brand Name",
        helper: "The name customers know you by.",
        placeholder: "Boostmate",
        type: "textarea",
        rows: 1,
        fullWidth: true,
      },
      {
        key: "brand_tagline",
        label: "Tagline",
        helper: "One short line that captures what you stand for.",
        placeholder: "The Growth OS for coaches and agencies.",
        type: "textarea",
        rows: 2,
        fullWidth: true,
      },
      {
        key: "brand_mission",
        label: "Mission",
        helper: "Why your brand exists — 1–2 sentences.",
        placeholder: "We help experts turn their expertise into a repeatable business — without burning out.",
        type: "textarea",
        rows: 3,
        fullWidth: true,
      },
    ],
  },
];

export const BRAND_FIELDS_BY_TAB: Record<BrandTabId, string[]> = Object.fromEntries(
  BRAND_STRATEGY_TABS.map((t) => [t.id, t.fields.map((f) => f.key)]),
) as Record<BrandTabId, string[]>;

export function calcBrandTabProgress(data: Record<string, any> | null | undefined, tabId: BrandTabId): number {
  const keys = BRAND_FIELDS_BY_TAB[tabId];
  const filled = keys.filter((k) => ((data?.[k] ?? "") as string).toString().trim().length > 0).length;
  return Math.round((filled / keys.length) * 100);
}

export function calcBrandIdentityProgress(data: Record<string, any> | null | undefined): number {
  const tabs: BrandTabId[] = ["positioning", "voice", "visual", "foundation"];
  const total = tabs.reduce((acc, t) => acc + calcBrandTabProgress(data, t), 0);
  return Math.round(total / tabs.length);
}

export type BrandIdentityData = Record<string, any>;
