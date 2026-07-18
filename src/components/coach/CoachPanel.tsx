// =============================================================================
// CoachPanel — scope-agnostic AI Coach floating panel.
// NOT a modal: sits bottom-right, does NOT overlay/dim the page. The rest of
// the app stays fully interactive while chatting.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2, RefreshCw, Check, X, Maximize2, Minimize2 } from "lucide-react";
import { useCoachChat } from "@/lib/coach/useCoachChat";
import type { CoachContext, CoachMessage, CoachMessagePart, CoachBlueprintWrite, CoachGrowthDecision } from "@/lib/coach/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CoachContext | null;
  /** Called when the user clicks "Replace field" on a proposed answer. */
  onApply?: (value: string) => void;
  /** Called when the user clicks "Apply all" on a batch blueprint-writes proposal. */
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
  /** Called when the user accepts a Coach-proposed Growth Roadmap decision. */
  onApplyGrowthDecision?: (decision: CoachGrowthDecision) => Promise<void> | void;
  /** When the panel opens with a fresh (empty) conversation, auto-send this
   *  text as the first user message exactly once. Used by the Growth Roadmap
   *  "Ask Coach" CTA to open the Coach already scoped to a specific task.
   *  The `key` guards against re-seeding when navigating between tasks. */
  pendingSeed?: { key: string; text: string } | null;
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
    const ls = context.target.listSection;
    if (ls) {
      const [minC, maxC] = ls.suggestedCount ?? [3, 5];
      const suggest = nl ? `Stel ${minC}–${maxC} items voor` : `Suggest ${minC}–${maxC} items`;
      const inspire = nl ? "Stel concrete voorbeelden voor" : "Propose concrete examples";
      const ask = nl ? "Stel me eerst wat vragen" : "Ask me a few questions first";
      const text = nl
        ? `Ik kan ${minC}–${maxC} **${context.target.label}** voor je voorstellen op basis van je Blueprint. Je kunt daarna per item accepteren of verwerpen.`
        : `I can propose ${minC}–${maxC} **${context.target.label}** items based on your Blueprint. You'll be able to accept or dismiss each one.`;
      return {
        id: "opener",
        role: "assistant",
        content: text,
        parts: [
          { type: "text", text },
          { type: "quick_replies", replies: [suggest, inspire, ask] },
        ],
      };
    }
    const text = nl
      ? `Laten we samen door **${context.target.label}** heen lopen. Ik zie wat je al hebt ingevuld — waar wil je beginnen?`
      : `Let's walk through **${context.target.label}** together. I can see what you've already filled in — where do you want to start?`;
    const replies = nl
      ? ["Wat mist er nog?", "Wat is het zwakst?", "Vul de hele sectie voor me in"]
      : ["What's still missing?", "What's the weakest part?", "Fill in the whole section for me"];
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

const CoachPanel = ({ open, onOpenChange, context, onApply, onApplyBlueprintWrites, onApplyGrowthDecision, pendingSeed }: Props) => {
  const { messages, status, error, sendMessage, decisions, recordDecision, conversationId } = useCoachChat(context, open);
  const [input, setInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
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
    close: nl ? "Sluiten" : "Close",
    expand: nl ? "Volledig scherm" : "Fullscreen",
    collapse: nl ? "Verkleinen" : "Exit fullscreen",
  };
  const isBusy = status === "sending" || status === "loading";


  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [displayMessages.length, open, status]);

  // Auto-seed: when the panel opens on a fresh (empty) conversation with a
  // pending seed message, send it exactly once. Guarded by seed key so that
  // switching between task-scoped Coach entries reseeds appropriately, and
  // by messages.length so we never replay on an existing conversation.
  const seededKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !pendingSeed || !conversationId) return;
    if (status !== "idle") return;
    if (messages.length > 0) return;
    if (seededKeyRef.current === pendingSeed.key) return;
    seededKeyRef.current = pendingSeed.key;
    void sendMessage(pendingSeed.text);
  }, [open, pendingSeed, conversationId, status, messages.length, sendMessage]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isBusy) return;
    setInput("");
    await sendMessage(value);
  };

  const handleApply = (value: string) => {
    onApply?.(value);
    // Field-scope: closing after apply still makes sense so the user sees the update.
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="AI Coach"
      className={cn(
        "fixed z-50 flex flex-col border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in duration-200",
        fullscreen
          ? "inset-4 md:inset-8 rounded-2xl slide-in-from-top-2"
          : "bottom-6 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-6rem)] rounded-2xl slide-in-from-bottom-4",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-card flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-display font-semibold truncate">
            Coach — {context?.target?.label ?? "Growth Strategist"}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{t.subtitle}</div>
        </div>
        <button
          type="button"
          aria-label={fullscreen ? t.collapse : t.expand}
          onClick={() => setFullscreen((v) => !v)}
          className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          type="button"
          aria-label={t.close}
          onClick={() => onOpenChange(false)}
          className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 bg-muted/20">
        <div className={cn("space-y-3", fullscreen && "max-w-3xl mx-auto w-full")}>
          {displayMessages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onQuickReply={(r) => handleSend(expandQuickReplyForContext(r, context))}
              onApply={handleApply}
              onRefine={(v) => handleSend(`${t.refinePrompt}\n\n${v}`)}
              onApplyBlueprintWrites={onApplyBlueprintWrites}
              onApplyGrowthDecision={onApplyGrowthDecision}
              initialDecisions={{ ...(decisions["__any__"] ?? {}), ...(decisions[m.id] ?? {}) }}
              onDecision={(writes, decision) => recordDecision(m.id, writes, decision)}
            />
          ))}
          {isBusy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t.thinking}
            </div>
          )}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">{error}</div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-card p-3">
        <div className={cn("flex items-end gap-2", fullscreen && "max-w-3xl mx-auto w-full")}>
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
            rows={fullscreen ? 3 : 2}
            className="resize-none text-sm"
            disabled={isBusy}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isBusy}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

    </div>
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
  onApplyGrowthDecision,
  initialDecisions,
  onDecision,
}: {
  message: CoachMessage;
  onQuickReply: (r: string) => void;
  onApply: (value: string) => void;
  onRefine: (value: string) => void;
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
  onApplyGrowthDecision?: (decision: CoachGrowthDecision) => Promise<void> | void;
  initialDecisions?: Record<string, "applied" | "dismissed">;
  onDecision?: (writes: CoachBlueprintWrite[], decision: "applied" | "dismissed") => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[90%] space-y-2", isUser ? "items-end" : "items-start")}>
        {message.parts.map((part, idx) => (
          <PartRenderer
            key={idx}
            part={part}
            isUser={isUser}
            onQuickReply={onQuickReply}
            onApply={onApply}
            onRefine={onRefine}
            onApplyBlueprintWrites={onApplyBlueprintWrites}
            onApplyGrowthDecision={onApplyGrowthDecision}
            initialDecisions={initialDecisions}
            onDecision={onDecision}
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
  onApplyGrowthDecision,
  initialDecisions,
  onDecision,
}: {
  part: CoachMessagePart;
  isUser: boolean;
  onQuickReply: (r: string) => void;
  onApply: (value: string) => void;
  onRefine: (value: string) => void;
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
  onApplyGrowthDecision?: (decision: CoachGrowthDecision) => Promise<void> | void;
  initialDecisions?: Record<string, "applied" | "dismissed">;
  onDecision?: (writes: CoachBlueprintWrite[], decision: "applied" | "dismissed") => void;
}) {
  if (part.type === "text") {
    // Strip legacy leaked tool-call syntax from historical assistant messages
    // that were saved before the server-side sanitizer landed.
    const cleaned = part.text
      .replace(
        /^\s*\[(?:propose_blueprint_writes|suggest_quick_replies|propose_field_value|remember_fact|proposed blueprint writes|suggested quick replies|proposed field value|remembered fact)\b[^\n]*$/gim,
        "",
      )
      .replace(/^\s*(?:path|label|value|reasoning|replies)\s*:\s*.*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!cleaned) return null;
    return (
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm",
        )}
      >
        <MarkdownContent text={cleaned} />
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
        initialDecisions={initialDecisions}
        onDecision={onDecision}
      />
    );
  }

  if (part.type === "growth_decision") {
    return (
      <GrowthDecisionCard
        decision={part.decision}
        reasoning={part.reasoning}
        onApply={onApplyGrowthDecision}
      />
    );
  }

  if (part.type === "memory_saved") return null;

  return null;
}

function GrowthDecisionCard({
  decision,
  reasoning,
  onApply,
}: {
  decision: CoachGrowthDecision;
  reasoning?: string;
  onApply?: (d: CoachGrowthDecision) => Promise<void> | void;
}) {
  const [state, setState] = useState<"pending" | "applying" | "applied" | "dismissed">("pending");
  if (state === "dismissed") return null;
  const handleApply = async () => {
    if (!onApply || state !== "pending") return;
    setState("applying");
    try {
      await onApply(decision);
      setState("applied");
    } catch {
      setState("pending");
    }
  };
  return (
    <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-3 space-y-2 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Roadmap decision
        </Badge>
      </div>
      <div className="text-sm text-foreground bg-background rounded-lg p-2.5 border">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {decision.label}
        </div>
        <div className="text-sm mt-0.5">{decision.value}</div>
      </div>
      {reasoning && <p className="text-[11px] text-muted-foreground italic">{reasoning}</p>}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {state === "applied" ? (
          <Badge variant="secondary" className="text-[10px]">Applied</Badge>
        ) : (
          <>
            <Button
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleApply}
              disabled={!onApply || state === "applying"}
            >
              {state === "applying" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Apply decision
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5"
              onClick={() => setState("dismissed")}
              disabled={state === "applying"}
            >
              <X className="w-3 h-3" />
              Dismiss
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

type ItemState = "pending" | "applying" | "applied" | "dismissed";

function BlueprintWritesCard({
  writes,
  reasoning,
  onApplyAll,
  initialDecisions,
  onDecision,
}: {
  writes: CoachBlueprintWrite[];
  reasoning?: string;
  onApplyAll?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
  initialDecisions?: Record<string, "applied" | "dismissed">;
  onDecision?: (writes: CoachBlueprintWrite[], decision: "applied" | "dismissed") => void;
}) {
  const [states, setStates] = useState<ItemState[]>(() =>
    writes.map((w) => (initialDecisions?.[w.path] ?? "pending") as ItemState),
  );
  const [batchApplying, setBatchApplying] = useState(false);

  const setAt = (i: number, s: ItemState) =>
    setStates((prev) => prev.map((v, idx) => (idx === i ? s : v)));

  const pendingIndices = states
    .map((s, i) => (s === "pending" ? i : -1))
    .filter((i) => i >= 0);
  const allHandled = states.every((s) => s === "applied" || s === "dismissed");

  const handleApplyOne = async (i: number) => {
    if (!onApplyAll || states[i] !== "pending") return;
    setAt(i, "applying");
    try {
      await onApplyAll([writes[i]]);
      setAt(i, "applied");
      onDecision?.([writes[i]], "applied");
    } catch {
      setAt(i, "pending");
    }
  };

  const handleDismissOne = (i: number) => {
    if (states[i] !== "pending") return;
    setAt(i, "dismissed");
    onDecision?.([writes[i]], "dismissed");
  };

  const handleApplyAllRemaining = async () => {
    if (!onApplyAll || batchApplying || !pendingIndices.length) return;
    setBatchApplying(true);
    const targets = pendingIndices.map((i) => writes[i]);
    setStates((prev) => prev.map((s) => (s === "pending" ? "applying" : s)));
    try {
      await onApplyAll(targets);
      setStates((prev) => prev.map((s) => (s === "applying" ? "applied" : s)));
      onDecision?.(targets, "applied");
    } catch {
      setStates((prev) => prev.map((s) => (s === "applying" ? "pending" : s)));
    } finally {
      setBatchApplying(false);
    }
  };

  const handleDismissAll = () => {
    const targets = pendingIndices.map((i) => writes[i]);
    setStates((prev) => prev.map((s) => (s === "pending" ? "dismissed" : s)));
    if (targets.length) onDecision?.(targets, "dismissed");
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
        {writes.map((w, i) => {
          const s = states[i];
          if (s === "dismissed") return null;
          const isApplied = s === "applied";
          const isApplying = s === "applying";
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border bg-background p-2 transition-opacity",
                isApplied && "opacity-60",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {w.label}
                  </div>
                  <div
                    className={cn(
                      "text-sm text-foreground whitespace-pre-wrap mt-0.5",
                      isApplied && "line-through",
                    )}
                  >
                    {w.value}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isApplied ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Applied
                    </Badge>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label="Apply this field"
                        onClick={() => handleApplyOne(i)}
                        disabled={!onApplyAll || isApplying || batchApplying}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {isApplying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Dismiss this field"
                        onClick={() => handleDismissOne(i)}
                        disabled={isApplying || batchApplying}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {reasoning && (
        <p className="text-[11px] text-muted-foreground italic">{reasoning}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {allHandled ? (
          <span className="text-[11px] text-muted-foreground italic">All handled</span>
        ) : (
          <>
            <Button
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleApplyAllRemaining}
              disabled={!onApplyAll || batchApplying || !pendingIndices.length}
            >
              {batchApplying ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  Apply all remaining ({pendingIndices.length})
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5"
              onClick={handleDismissAll}
              disabled={batchApplying || !pendingIndices.length}
            >
              <X className="w-3 h-3" />
              Dismiss all
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="coach-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}


function expandQuickReplyForContext(reply: string, context: CoachContext | null) {
  const text = reply.trim();
  const lower = text.toLowerCase();

  if (/\b(propose\s+(?:the\s+)?writes?|propose\s+(?:the\s+)?updates?|stel\s+(?:de\s+)?writes?\s+voor|geef\s+(?:de\s+)?writes?)\b/.test(lower)) {
    return `${text}. Propose the Blueprint updates for the current Main Offer step so I can apply them.`;
  }

  if (/\b(looks good|next step|volgende stap|ziet er goed uit)\b/.test(lower)) {
    return `${text}. First propose the Blueprint updates for this step so I can apply them; then we can move to the next step.`;
  }

  if (!context?.target) return text;

  const target = context.target.label;

  if (context.target.listSection) {
    if (/inspire|examples|voorbeelden|idee|ideas|suggest|propose|voorstel/.test(lower)) {
      return `${text}. Propose concrete ${target} items as Blueprint updates that I can apply.`;
    }
    return text;
  }

  if (context.scope === "blueprint.field") {
    if (/give examples|geef voorbeelden|inspire|voorbeelden|rewrite|herschrijf|sharpen|aanscherpen|expand|uitbreiden/.test(lower)) {
      return `${text}. Draft a concrete value for the ${target} field that I can apply.`;
    }
  }

  return text;
}

export default CoachPanel;
