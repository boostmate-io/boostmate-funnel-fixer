// =============================================================================
// useCoachChat — client hook for the AI Coach.
// - Ensures a persistent conversation per (user, scope, target_id)
// - Loads existing messages
// - Sends new user turns to the coach-chat edge function
// - Appends returned assistant message (with parts) to local state
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CoachContext, CoachMessage, CoachMessagePart } from "./types";

type Status = "idle" | "loading" | "sending" | "error";
export type ProposalDecision = "applied" | "dismissed";

const isVirtualListPath = (path: string) => /(?:^|\.)new_\d+(?:\.|$)/.test(path);

export function useCoachChat(context: CoachContext | null, enabled: boolean) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // messageId -> path -> decision. Also keyed under "__any__" for decisions
  // whose message_id is null (older rows or bulk ops).
  const [decisions, setDecisions] = useState<Record<string, Record<string, ProposalDecision>>>({});
  const initKey = useRef<string | null>(null);

  const targetKey = context?.target?.id ?? "__global__";
  const scope = context?.scope ?? null;
  const subAccountId = context?.businessContext.subAccountId ?? null;
  const targetLabel = context?.target?.label ?? null;
  const userId = user?.id ?? null;

  // Keep a live ref to context so we can snapshot it on insert without
  // re-triggering the effect every time the parent recreates the object.
  const contextRef = useRef<CoachContext | null>(context);
  contextRef.current = context;

  // Ensure conversation + load messages when context becomes available.
  // Deps are stable primitives only — the parent may recreate the `context`
  // object every render (e.g. GlobalCoachBubble), and we must NOT let that
  // cancel an in-flight load and leave `status` stuck on "loading".
  useEffect(() => {
    if (!enabled || !scope || !userId || !subAccountId) return;
    const key = `${scope}::${targetKey}::${subAccountId}::${userId}`;
    if (initKey.current === key) return;
    initKey.current = key;

    (async () => {
      setStatus("loading");
      setError(null);
      setMessages([]);
      setConversationId(null);

      // 1) Find existing
      const { data: existing } = await supabase
        .from("ai_coach_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("sub_account_id", subAccountId)
        .eq("scope", scope)
        .eq("target_id", targetKey)
        .maybeSingle();

      let convId = existing?.id as string | undefined;

      // 2) Create if missing
      if (!convId) {
        const { data: created, error: insErr } = await supabase
          .from("ai_coach_conversations")
          .insert({
            user_id: userId,
            sub_account_id: subAccountId,
            scope,
            target_id: targetKey,
            target_label: targetLabel,
            context_snapshot: (contextRef.current ?? {}) as any,
          })
          .select("id")
          .single();
        if (insErr || !created) {
          setError(insErr?.message ?? "Failed to start coach conversation");
          setStatus("error");
          return;
        }
        convId = created.id;
      }

      // 3) Load messages
      const { data: msgs } = await supabase
        .from("ai_coach_messages")
        .select("id, role, content, parts, created_at")
        .eq("conversation_id", convId!)
        .order("created_at", { ascending: true });

      setConversationId(convId!);
      setMessages(
        (msgs ?? []).map((m) => ({
          id: m.id,
          role: m.role as CoachMessage["role"],
          content: m.content ?? "",
          parts: (m.parts as CoachMessagePart[]) ?? [{ type: "text", text: m.content ?? "" }],
          created_at: m.created_at,
        })),
      );
      setStatus("idle");
    })();
  }, [enabled, scope, targetKey, subAccountId, userId, targetLabel]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !context || !text.trim()) return;

      const userMsg: CoachMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
        parts: [{ type: "text", text }],
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setStatus("sending");
      setError(null);

      try {
        const { data, error: fnErr } = await supabase.functions.invoke("coach-chat", {
          body: {
            conversationId,
            context,
            messages: nextMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });

        if (fnErr) throw new Error(fnErr.message);
        if ((data as any)?.error) throw new Error((data as any).error);

        const assistant = (data as any)?.message as CoachMessage | undefined;
        if (assistant) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistant.id,
              role: "assistant",
              content: assistant.content ?? "",
              parts: (assistant.parts as CoachMessagePart[]) ?? [
                { type: "text", text: assistant.content ?? "" },
              ],
              created_at: assistant.created_at,
            },
          ]);
        }
        setStatus("idle");
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong");
        setStatus("error");
      }
    },
    [conversationId, context, messages],
  );

  return {
    conversationId,
    messages,
    status,
    error,
    sendMessage,
  };
}
