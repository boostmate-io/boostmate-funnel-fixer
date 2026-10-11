import { useEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useOptionalCoach } from "@/contexts/CoachContext";

export type OfferSaveStatus = "saved" | "pending" | "saving" | "error";
export interface OfferEditorTab { id: string; label: string; content: ReactNode }
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: { id: string; name: string; category: string; primary: boolean };
  tabs: OfferEditorTab[];
  initialTab?: string;
  saveStatus?: OfferSaveStatus;
  flushChanges?: () => Promise<boolean>;
  /** Hide the header Coach button (categories without approved Coach support). */
  coachAvailable?: boolean;
  /** Notified whenever the active tab changes (Coach tab scope). */
  onTabChange?: (tabId: string) => void;
  /** Header Coach button handler (defaults to opening the Coach unfocused). */
  onOpenCoach?: () => void;
}

/** Presentation only: persistence and field configuration belong to the caller. */
export default function OfferEditorShell({ open, onOpenChange, offer, tabs, initialTab, saveStatus = "saved", flushChanges, coachAvailable = true, onTabChange, onOpenCoach }: Props) {
  const coach = useOptionalCoach();
  const companion = !!coach?.open;
  const [active, setActive] = useState(initialTab ?? tabs[0]?.id ?? "");
  const [closing, setClosing] = useState(false);
  const [closeFailed, setCloseFailed] = useState(false);
  const closeLock = useRef(false);
  const coachButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      setActive(tabs.some((t) => t.id === initialTab) ? initialTab ?? "" : tabs[0]?.id ?? "");
      setCloseFailed(false);
    }
  // Tab contents change with typing; reset only on opening / identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer.id, initialTab]);
  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;
  useEffect(() => { if (active) onTabChangeRef.current?.(active); }, [active]);
  const close = async () => {
    if (closeLock.current) return;
    closeLock.current = true;
    setClosing(true);
    try {
      const saved = flushChanges ? await flushChanges() : saveStatus === "saved";
      setCloseFailed(!saved);
      if (saved) onOpenChange(false);
    } catch { setCloseFailed(true); }
    finally { closeLock.current = false; setClosing(false); }
  };
  const status = closeFailed || saveStatus === "error" ? "Save failed — changes kept" : closing || saveStatus === "saving" ? "Saving…" : saveStatus === "pending" ? "Unsaved changes" : "All changes saved";
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void close(); }} modal={!companion}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="offer-editor-backdrop fixed inset-0 z-50" />
        <DialogPrimitive.Content
          data-offer-editor=""
          data-coach-companion={companion ? "open" : "closed"}
          className="offer-editor-shell fixed z-50 flex flex-col overflow-hidden border border-border bg-background shadow-lg"
          onPointerDownOutside={(event) => {
            if (event.target instanceof Element && event.target.closest("[data-coach-panel]")) event.preventDefault();
          }}
          onFocusOutside={(event) => { if (companion) event.preventDefault(); }}
          onEscapeKeyDown={(event) => {
            if (companion) {
              event.preventDefault();
              coach?.closeCoach();
              coachButton.current?.focus();
            }
          }}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-xl font-display">{offer.name}</DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <DialogDescription className="text-xs text-muted-foreground">{offer.category}</DialogDescription>
                {offer.primary && <Badge variant="secondary">Primary</Badge>}
              </div>
            </div>
            {coach && coachAvailable && <Button ref={coachButton} variant="outline" size="icon" className="min-h-11 min-w-11" aria-label={companion ? "Close AI Coach" : "Open AI Coach"} onClick={() => companion ? coach.closeCoach() : onOpenCoach ? onOpenCoach() : coach.openCoach()}><MessageCircle className="h-4 w-4" /></Button>}
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full bg-muted/80" aria-label="Close offer editor" disabled={closing} onClick={() => void close()}><X className="h-4 w-4" /></Button>
          </header>
          <Tabs value={active} onValueChange={setActive} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 overflow-x-auto border-b border-border px-4 sm:px-6">
              <TabsList aria-label="Offer editor sections" className="h-auto justify-start gap-1 rounded-none bg-transparent p-0">
                {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id} className="min-h-11 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">{tab.label}</TabsTrigger>)}
              </TabsList>
            </div>
            {tabs.map((tab) => <TabsContent forceMount key={tab.id} value={tab.id} className="m-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"><div className="px-4 py-4">{tab.content}</div></TabsContent>)}
          </Tabs>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
              {closing || saveStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "All changes saved" ? <Check className="h-4 w-4" /> : null}{status}
            </p>
            <Button disabled={closing} onClick={() => void close()} className="min-h-11">{closeFailed ? "Retry & close" : "Done"}</Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}