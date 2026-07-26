// =============================================================================
// stageIdentity — per-stage visual identity for the Growth Roadmap.
//
// Purely presentational: icon + semantic token-based accent classes + the i18n
// keys for the explanatory copy shown in the stage info dialog and the current
// stage summary. No logic and no scoring lives here — see `engine.ts`.
//
// All accent classes are written as full literal strings so Tailwind can pick
// them up during its source scan.
// =============================================================================

import { Gauge, Rocket, Settings2, Magnet, TrendingUp, type LucideIcon } from "lucide-react";
import type { GrowthStage } from "./types";

export interface StageIdentity {
  key: GrowthStage;
  order: number;
  icon: LucideIcon;
  /** Tailwind classes bound to the `--stage-*` design tokens. */
  text: string;
  bg: string;
  softBg: string;
  border: string;
  ring: string;
  /** i18n keys for the extended explanatory copy. */
  summaryKey: string;
  typicalKey: string;
  unlockKey: string;
  focusKey: string;
  successKey: string;
}

export const STAGE_IDENTITY: Record<GrowthStage, StageIdentity> = {
  validate: {
    key: "validate",
    order: 1,
    icon: Rocket,
    text: "text-stage-validate",
    bg: "bg-stage-validate",
    softBg: "bg-stage-validate/10",
    border: "border-stage-validate",
    ring: "ring-stage-validate/30",
    summaryKey: "growth.stage.validate.summary",
    typicalKey: "growth.stage.validate.typical",
    unlockKey: "growth.stage.validate.unlock",
    focusKey: "growth.stage.validate.focus",
    successKey: "growth.stage.validate.success",
  },
  attract: {
    key: "attract",
    order: 2,
    icon: Magnet,
    text: "text-stage-attract",
    bg: "bg-stage-attract",
    softBg: "bg-stage-attract/10",
    border: "border-stage-attract",
    ring: "ring-stage-attract/30",
    summaryKey: "growth.stage.attract.summary",
    typicalKey: "growth.stage.attract.typical",
    unlockKey: "growth.stage.attract.unlock",
    focusKey: "growth.stage.attract.focus",
    successKey: "growth.stage.attract.success",
  },
  optimize: {
    key: "optimize",
    order: 3,
    icon: Gauge,
    text: "text-stage-optimize",
    bg: "bg-stage-optimize",
    softBg: "bg-stage-optimize/10",
    border: "border-stage-optimize",
    ring: "ring-stage-optimize/30",
    summaryKey: "growth.stage.optimize.summary",
    typicalKey: "growth.stage.optimize.typical",
    unlockKey: "growth.stage.optimize.unlock",
    focusKey: "growth.stage.optimize.focus",
    successKey: "growth.stage.optimize.success",
  },
  scale: {
    key: "scale",
    order: 4,
    icon: TrendingUp,
    text: "text-stage-scale",
    bg: "bg-stage-scale",
    softBg: "bg-stage-scale/10",
    border: "border-stage-scale",
    ring: "ring-stage-scale/30",
    summaryKey: "growth.stage.scale.summary",
    typicalKey: "growth.stage.scale.typical",
    unlockKey: "growth.stage.scale.unlock",
    focusKey: "growth.stage.scale.focus",
    successKey: "growth.stage.scale.success",
  },
  systemize: {
    key: "systemize",
    order: 5,
    icon: Settings2,
    text: "text-stage-systemize",
    bg: "bg-stage-systemize",
    softBg: "bg-stage-systemize/10",
    border: "border-stage-systemize",
    ring: "ring-stage-systemize/30",
    summaryKey: "growth.stage.systemize.summary",
    typicalKey: "growth.stage.systemize.typical",
    unlockKey: "growth.stage.systemize.unlock",
    focusKey: "growth.stage.systemize.focus",
    successKey: "growth.stage.systemize.success",
  },
};

export type StageState = "completed" | "current" | "locked";

export function stageState(index: number, currentIndex: number, allDone = false): StageState {
  if (allDone) return "completed";
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "locked";
}
