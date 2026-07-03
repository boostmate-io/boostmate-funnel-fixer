// =============================================================================
// CoachPanel — scope-agnostic AI Coach side sheet.
// Consumes a CoachContext (Blueprint field, Copy component, Funnel node, ...).
// Renders chat + proposed-answer cards + quick replies + composer.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2, RefreshCw, Check } from "lucide-react";
import { useCoachChat } from "@/lib/coach/useCoachChat";
import type { CoachContext, CoachMessage, CoachMessagePart, CoachBlueprintWrite } from "@/lib/coach/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CoachContext | null;
  /** Called when the user clicks "Replace field" on a proposed answer. */
  onApply?: (value: string) => void;
  /** Called when the user clicks "Apply all" on a batch blueprint-writes proposal. */
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
}

const openerFor = (context: CoachContext | null): CoachMessage | null => {
  if (!context) return null;
  const locale = (context.businessContext.locale ?? "en").toLowerCase().slice(0, 2);
  const nl = locale === "nl";

  if (context.scope === "global") {
    const text = nl
      ? "Hoi! Ik ben je **Growth Strategist**. Ik ken je Blueprint en denk mee over strategie, aanbod, funnels of copy. Waar wil je vandaag scherper op worden?"
      : "Hi! I'm your **Growth Strategist**. I know your Blueprint and can help you think through strategy, offers, funnels or copy. What do you want to sharpen today?";
    const replies = nl
      ? ["Wat is nu mijn grootste bottleneck?", "Check mijn positionering", "Ideeën voor mijn volgende aanbod"]
      : ["What's my biggest bottleneck right now?", "Check my positioning", "Ideas for my next offer"];
    return {
      id: "opener",
      role: "assistant",
      content: text,
      parts: [
        { type: "text", text },
        { type: "quick_replies", replies },
      ],
    };
  }

  if (context.scope === "blueprint.section" && context.target) {
    const text = nl
      ? `Laten we samen door **${context.target.label}** heen lopen. Ik zie wat je al hebt ingevuld — waar wil je beginnen?`
      : `Let's walk through **${context.target.label}** together. I can see what you've already filled in — where do you want to start?`;
    const replies = nl
      ? ["Wat mist er nog?", "Wat is het zwakst?", "Geef me een prioriteitenlijstje"]
      : ["What's still missing?", "What's the weakest part?", "Give me a priority list"];
    return {
      id: "opener",
      role: "assistant",
      content: text,
      parts: [
        { type: "text", text },
        { type: "quick_replies", replies },
      ],
    };
  }

  if (!context.target) return null;
  const label = context.target.label;
  const hasValue = !!context.target.currentValue?.trim();
  const text = nl
    ? hasValue
      ? `Ik zie dat je al iets hebt staan voor **${label}**. Wil je dat ik het aanscherp, uitbreid, of helemaal herschrijf?`
      : `Laten we samen **${label}** invullen. Ik kan je vragen stellen, voorbeelden geven, of gewoon meedenken — waar heb je het meest aan?`
    : hasValue
      ? `I can see you already have something for **${label}**. Want me to sharpen it, expand it, or rewrite it from scratch?`
      : `Let's fill in **${label}** together. I can ask you questions, give examples, or just brainstorm — what would help most?`;
  const replies = nl
    ? hasValue
      ? ["Aanscherpen", "Uitbreiden", "Helemaal herschrijven"]
      : ["Stel me vragen", "Geef voorbeelden", "Ik heb al ideeën"]
    : hasValue
      ? ["Sharpen it", "Expand it", "Rewrite from scratch"]
      : ["Ask me questions", "Give examples", "I have some ideas"];
  return {
    id: "opener",
    role: "assistant",
    content: text,
    parts: [
      { type: "text", text },
      { type: "quick_replies", replies },
    ],
  };
};

const CoachPanel = ({ open, onOpenChange, context, onApply, onApplyBlueprintWrites }: Props) => {
  const { messages, status, error, sendMessage } = useCoachChat(context, open);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const opener = useMemo(() => openerFor(context), [context]);
  const displayMessages = messages.length > 0 || !opener ? messages : [opener];
  const nl = (context?.businessContext.locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  const t = {
    thinking: nl ? "Denken…" : "Thinking…",
    placeholder: nl ? "Typ je bericht… (Enter om te versturen)" : "Type your message… (Enter to send)",
    subtitle: nl ? "Chat tot we op het juiste antwoord landen." : "Chat until we land on the right answer.",
    refinePrompt: nl
      ? "Scherp deze versie verder aan, houd de kern maar maak hem sterker:"
      : "Sharpen this version further — keep the core, make it stronger:",
  };

  useEffect(() => {
    if (open) {
      // scroll to bottom on new message
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [displayMessages.length, open, status]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || status === "sending") return;
    setInput("");
    await sendMessage(value);
  };

  const handleApply = (value: string) => {
    onApply?.(value);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="p-5 border-b bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-display truncate">
                Coach — {context?.target?.label ?? "Growth Strategist"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {t.subtitle}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-muted/20"
        >
          {displayMessages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onQuickReply={(r) => handleSend(r)}
              onApply={handleApply}
              onRefine={(v) => handleSend(`${t.refinePrompt}\n\n${v}`)}
              onApplyBlueprintWrites={onApplyBlueprintWrites}
            />
          ))}
          {status === "sending" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t.thinking}
            </div>
          )}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-card p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.placeholder}
              rows={2}
              className="resize-none text-sm"
              disabled={status === "sending"}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || status === "sending"}
            >
              {status === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// -----------------------------------------------------------------------------
// Bubble + parts renderer
// -----------------------------------------------------------------------------

function MessageBubble({
  message,
  onQuickReply,
  onApply,
  onRefine,
  onApplyBlueprintWrites,
}: {
  message: CoachMessage;
  onQuickReply: (r: string) => void;
  onApply: (value: string) => void;
  onRefine: (value: string) => void;
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        {message.parts.map((part, idx) => (
          <PartRenderer
            key={idx}
            part={part}
            isUser={isUser}
            onQuickReply={onQuickReply}
            onApply={onApply}
            onRefine={onRefine}
            onApplyBlueprintWrites={onApplyBlueprintWrites}
          />
        ))}
      </div>
    </div>
  );
}

function PartRenderer({
  part,
  isUser,
  onQuickReply,
  onApply,
  onRefine,
  onApplyBlueprintWrites,
}: {
  part: CoachMessagePart;
  isUser: boolean;
  onQuickReply: (r: string) => void;
  onApply: (value: string) => void;
  onRefine: (value: string) => void;
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
}) {
  if (part.type === "text") {
    if (!part.text.trim()) return null;
    return (
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm",
        )}
      >
        {renderInlineBold(part.text)}
      </div>
    );
  }

  if (part.type === "quick_replies") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {part.replies.map((r) => (
          <button
            key={r}
            onClick={() => onQuickReply(r)}
            className="text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            {r}
          </button>
        ))}
      </div>
    );
  }

  if (part.type === "proposal") {
    return (
      <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-3 space-y-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Proposed answer
          </Badge>
        </div>
        <div className="text-sm text-foreground bg-background rounded-lg p-2.5 border whitespace-pre-wrap">
          {part.value}
        </div>
        {part.reasoning && (
          <p className="text-[11px] text-muted-foreground italic">{part.reasoning}</p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" className="h-7 gap-1.5" onClick={() => onApply(part.value)}>
            <Check className="w-3 h-3" />
            Replace field
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            onClick={() => onRefine(part.value)}
          >
            <RefreshCw className="w-3 h-3" />
            Refine
          </Button>
        </div>
      </div>
    );
  }

  if (part.type === "blueprint_writes") {
    return (
      <BlueprintWritesCard
        writes={part.writes}
        reasoning={part.reasoning}
        onApplyAll={onApplyBlueprintWrites}
      />
    );
  }

  // memory_saved is intentionally hidden from the UI — memory still persists
  // server-side. A future Memory Inspector in Settings will surface it.
  if (part.type === "memory_saved") return null;

  return null;
}

function BlueprintWritesCard({
  writes,
  reasoning,
  onApplyAll,
}: {
  writes: CoachBlueprintWrite[];
  reasoning?: string;
  onApplyAll?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
}) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    if (!onApplyAll || applying || applied) return;
    setApplying(true);
    try {
      await onApplyAll(writes);
      setApplied(true);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-3 space-y-2 shadow-sm w-full">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Blueprint updates ({writes.length})
        </Badge>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {writes.map((w, i) => (
          <div key={i} className="rounded-lg border bg-background p-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {w.label}
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
              {w.value}
            </div>
          </div>
        ))}
      </div>
      {reasoning && (
        <p className="text-[11px] text-muted-foreground italic">{reasoning}</p>
      )}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          size="sm"
          className="h-7 gap-1.5"
          onClick={handleApply}
          disabled={!onApplyAll || applying || applied}
        >
          {applied ? (
            <>
              <Check className="w-3 h-3" />
              Applied
            </>
          ) : applying ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Applying…
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              Apply all
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Minimal **bold** support — no full markdown yet, keeps bundle small.
function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default CoachPanel;
