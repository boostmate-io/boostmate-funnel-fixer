// =============================================================================
// CoachProvider — single Business Coach conversation for the whole app.
//
// There is exactly ONE CoachPanel instance (rendered by GlobalCoachBubble) and
// ONE persisted conversation per (user, workspace). Every Coach entry point
// calls `openCoach(focus)` which opens that same panel and injects a focus
// turn instead of starting a new chat.
// =============================================================================

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import i18n from "@/i18n";
import { buildFocusTurnText, type CoachFocus } from "@/lib/coach/focus";

interface CoachApi {
  open: boolean;
  focus: CoachFocus | null;
  /** Focus turn to inject once (key-guarded) into the single conversation. */
  focusTurn: { key: string; text: string } | null;
  openCoach: (focus?: CoachFocus | null) => void;
  closeCoach: () => void;
}

const Ctx = createContext<CoachApi | null>(null);

export const CoachProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<CoachFocus | null>(null);
  const [focusTurn, setFocusTurn] = useState<{ key: string; text: string } | null>(null);
  const lastLabelRef = useRef<string | null>(null);

  const openCoach = useCallback((next?: CoachFocus | null) => {
    if (next) {
      const locale = (i18n.language ?? "en").split("-")[0];
      const text = buildFocusTurnText(next, lastLabelRef.current, locale);
      lastLabelRef.current = next.label;
      setFocus(next);
      setFocusTurn({ key: next.key, text });
    } else {
      setFocus(null);
      setFocusTurn(null);
    }
    setOpen(true);
  }, []);

  const closeCoach = useCallback(() => {
    setOpen(false);
    setFocus(null);
    setFocusTurn(null);
  }, []);

  const value = useMemo<CoachApi>(
    () => ({ open, focus, focusTurn, openCoach, closeCoach }),
    [open, focus, focusTurn, openCoach, closeCoach],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCoach(): CoachApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCoach must be used inside <CoachProvider>");
  }
  return ctx;
}

export type { CoachFocus };
