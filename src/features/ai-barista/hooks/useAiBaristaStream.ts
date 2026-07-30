"use client";

import { useCallback, useRef } from "react";

import type { AIProviderMessage } from "../lib/providers/types";

interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

/**
 * Sprint 3.9, Task 4 — the low-level half of streaming: POSTs to this
 * project's own `/api/ai-barista/chat` Route Handler (never Ollama
 * directly — see that route's own doc comment for why) and yields each
 * newline-delimited JSON chunk as it arrives. `cancel()` aborts the
 * in-flight fetch, which the reader's next `read()` rejects with a real
 * `AbortError` — `useAiBaristaChat` is what turns that into "cancel
 * generation" behavior.
 */
export function useAiBaristaStream() {
  const controllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(async function* (messages: AIProviderMessage[]): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    controllerRef.current = controller;

    const response = await fetch("/api/ai-barista/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI Barista request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          yield JSON.parse(line) as StreamChunk;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { stream, cancel };
}
