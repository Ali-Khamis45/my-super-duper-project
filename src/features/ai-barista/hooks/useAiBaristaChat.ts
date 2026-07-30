"use client";

import { useCallback } from "react";

import { appEvents } from "@/engine/events";
import { useAiBaristaStore } from "@/stores/ai-barista-store";

import { buildProviderMessages } from "../lib/promptBuilder";
import type { ChatMessage } from "../types";
import { useAiBaristaStream } from "./useAiBaristaStream";

/**
 * Sprint 3.9, Task 4 — orchestrates the store (conversation state) and
 * `useAiBaristaStream` (the transport) into `send`/`retry`/`cancel`, and is
 * the one place that emits the `ai-barista:*` EventBus events. Reads via
 * `useAiBaristaStore.getState()` after each store mutation rather than the
 * hook's own reactive `messages` snapshot — the store update from
 * `addUserMessage`/`removeLastMessage` hasn't re-rendered this hook yet at
 * that point in the same call stack, so the reactive value would still be
 * stale.
 */
export function useAiBaristaChat() {
  const messages = useAiBaristaStore((state) => state.messages);
  const isStreaming = useAiBaristaStore((state) => state.isStreaming);
  const conversationId = useAiBaristaStore((state) => state.conversationId);
  const beginAssistantMessage = useAiBaristaStore((state) => state.beginAssistantMessage);
  const appendToAssistantMessage = useAiBaristaStore((state) => state.appendToAssistantMessage);
  const completeAssistantMessage = useAiBaristaStore((state) => state.completeAssistantMessage);
  const failAssistantMessage = useAiBaristaStore((state) => state.failAssistantMessage);
  const addUserMessage = useAiBaristaStore((state) => state.addUserMessage);
  const removeLastMessage = useAiBaristaStore((state) => state.removeLastMessage);
  const { stream, cancel } = useAiBaristaStream();

  const run = useCallback(
    async (history: ChatMessage[]) => {
      beginAssistantMessage();
      appEvents.emit({ name: "ai-barista:response-started", conversationId });
      const startedAt = performance.now();

      try {
        for await (const chunk of stream(buildProviderMessages(history))) {
          if (chunk.error) throw new Error(chunk.error);
          if (chunk.content) appendToAssistantMessage(chunk.content);
          if (chunk.done) break;
        }
        completeAssistantMessage();
        appEvents.emit({ name: "ai-barista:response-completed", conversationId, durationMs: performance.now() - startedAt });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          completeAssistantMessage();
          appEvents.emit({ name: "ai-barista:response-cancelled", conversationId });
          return;
        }
        failAssistantMessage();
        appEvents.emit({
          name: "ai-barista:response-failed",
          conversationId,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [stream, conversationId, beginAssistantMessage, appendToAssistantMessage, completeAssistantMessage, failAssistantMessage],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      addUserMessage(trimmed);
      appEvents.emit({ name: "ai-barista:message-sent", conversationId });
      void run(useAiBaristaStore.getState().messages);
    },
    [isStreaming, addUserMessage, conversationId, run],
  );

  const retry = useCallback(() => {
    if (isStreaming) return;
    const current = useAiBaristaStore.getState().messages;
    if (current[current.length - 1]?.status === "error") removeLastMessage();
    void run(useAiBaristaStore.getState().messages);
  }, [isStreaming, removeLastMessage, run]);

  return { messages, isStreaming, send, retry, cancel };
}
