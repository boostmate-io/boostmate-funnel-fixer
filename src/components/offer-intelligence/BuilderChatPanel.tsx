// Builder AI conversation — one conversation per Builder session, separate from
// Offer Design Coach threads. Advisory only: replies never change decisions or
// offers. Uses simple custom primitives like the existing Coach (scoped
// exception to AI Elements: non-streaming custom persisted protocol).
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Compass, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { builderErrorMessage, loadBuilderChat, sendBuilderChat, type BuilderChatMessage, type BuilderError, type BuilderSession } from "@/lib/offers/offerBuilder";

export default function BuilderChatPanel({ session }: { session: BuilderSession }) {
  const [messages, setMessages] = useState<BuilderChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const readOnly = session.status !== "active";
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => { let live = true; loadBuilderChat(session.id).then((m) => { if (live) setMessages(m); }); return () => { live = false; }; }, [session.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, sending]);
  useEffect(() => { if (!sending && !readOnly) inputRef.current?.focus({ preventScroll: true }); }, [sending, readOnly]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || readOnly) return;
    setInput(""); setError(null); setSending(true);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() }]);
    try {
      const { reply } = await sendBuilderChat(sessionRef.current, text);
      setMessages((m) => [...m, { id: `tmp-a-${Date.now()}`, role: "assistant", content: reply, created_at: new Date().toISOString() }]);
    } catch (e) {
      setError(builderErrorMessage((e as BuilderError).code));
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col min-h-[420px] h-[calc(100vh-220px)] rounded-xl border border-border bg-background">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10"><Compass className="w-4 h-4 text-primary" /></span>
        <div><p className="text-sm font-display font-semibold text-foreground leading-tight">Offer strategist</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Advice only — you decide in the Builder.</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite">
        {messages.length === 0 && !sending && <p className="text-xs text-muted-foreground">Ask anything about this offer — e.g. "Which option fits a time-poor buyer best?" or "Is this price credible?"</p>}
        {messages.map((m) => m.role === "user" ? (
          <div key={m.id} className="ml-6 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
        ) : (
          <div key={m.id} className="prose prose-sm max-w-none text-foreground dark:prose-invert"><ReactMarkdown>{m.content}</ReactMarkdown></div>
        ))}
        {sending && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Thinking…</p>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>
      <form className="border-t border-border p-2 flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Textarea ref={inputRef} aria-label="Message the offer strategist" rows={2} maxLength={4000} value={input} disabled={readOnly}
          placeholder={readOnly ? "This session is closed." : "Ask the strategist…"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} className="resize-none" />
        <Button type="submit" size="icon" disabled={readOnly || sending || !input.trim()} aria-label="Send"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
