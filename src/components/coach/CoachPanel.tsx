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
import type { CoachContext, CoachMessage, CoachMessagePart } from "@/lib/coach/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CoachContext | null;
  /** Called when the user clicks "Replace field" on a proposed answer. */
  onApply?: (value: string) => void;
}

const openerFor = (context: CoachContext | null): CoachMessage | null => {
  if (!context) return null;

  if (context.scope === "global") {
    const text =
      "Hoi! Ik ben je **Growth Strategist**. Ik ken je Blueprint en denk mee over strategie, aanbod, funnels of copy. Waar wil je vandaag scherper op worden?";
    return {
      id: "opener",
      role: "assistant",
      content: text,
      parts: [
        { type: "text", text },
        {
          type: "quick_replies",
          replies: ["Wat is nu mijn grootste bottleneck?", "Check mijn positionering", "Ideeën voor mijn volgende aanbod"],
        },
      ],
    };
  }

  if (context.scope === "blueprint.section" && context.target) {
    const text = `Laten we samen door **${context.target.label}** heen lopen. Ik zie wat je al hebt ingevuld — waar wil je beginnen?`;
    return {
      id: "opener",
      role: "assistant",
      content: text,
      parts: [
        { type: "text", text },
        {
          type: "quick_replies",
          replies: ["Wat mist er nog?", "Wat is het zwakst?", "Geef me een prioriteitenlijstje"],
        },
      ],
    };
  }

  if (!context.target) return null;
  const label = context.target.label;
  const hasValue = !!context.target.currentValue?.trim();
  const text = hasValue
    ? `Ik zie dat je al iets hebt staan voor **${label}**. Wil je dat ik het aanscherp, uitbreid, of helemaal herschrijf?`
    : `Laten we samen **${label}** invullen. Ik kan je vragen stellen, voorbeelden geven, of gewoon meedenken — waar heb je het meest aan?`;
  const replies = hasValue
    ? ["Aanscherpen", "Uitbreiden", "Helemaal herschrijven"]
    : ["Stel me vragen", "Geef voorbeelden", "Ik heb al ideeën"];
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

const CoachPanel = ({ open, onOpenChange, context, onApply }: Props) => {
  const { messages, status, error, sendMessage } = useCoachChat(context, open);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const opener = useMemo(() => openerFor(context), [context]);
  const displayMessages = messages.length > 0 || !opener ? messages : [opener];

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
                Chat until we land on the right answer.
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
              onRefine={(v) =>
                handleSend(`Scherp deze versie verder aan, houd de kern maar maak hem sterker:\n\n${v}`)
              }
            />
          ))}
          {status === "sending" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Denken…
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
              placeholder="Type your message… (Enter to send)"
              rows={2}
              className="resize-none text-sm"
              disabled={status === "sending" || status === "loading"}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || status === "sending" || status === "loading"}
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
}: {
  message: CoachMessage;
  onQuickReply: (r: string) => void;
  onApply: (value: string) => void;
  onRefine: (value: string) => void;
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
}: {
  part: CoachMessagePart;
  isUser: boolean;
  onQuickReply: (r: string) => void;
  onApply: (value: string) => void;
  onRefine: (value: string) => void;
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

  if (part.type === "memory_saved") {
    return (
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border">
        <Sparkles className="w-3 h-3 text-primary" />
        Onthouden: <span className="font-medium text-foreground">{part.key}</span>
      </div>
    );
  }

  return null;
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
