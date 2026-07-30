import type { AIProvider, AIProviderMessage, AIStreamChunk } from "./types";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1";

interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
}

interface OllamaChatChunk {
  message?: { content?: string };
  done?: boolean;
}

/**
 * Sprint 3.9, Task 4 — the only provider implemented this sprint, per the
 * brief's explicit "Do NOT use placeholder AI. Use Ollama." Talks to
 * Ollama's real `POST /api/chat` endpoint (newline-delimited JSON
 * streaming). Server-side only — this module is imported exclusively by
 * `src/app/api/ai-barista/chat/route.ts`; Ollama's `localhost:11434` is
 * only reachable from wherever the Next.js server process itself runs, not
 * from a customer's browser, so the client never talks to it directly.
 * Model/host are env-configurable (`OLLAMA_BASE_URL`/`OLLAMA_MODEL`) so
 * swapping between llama3.1/qwen/mistral/gemma — any model already pulled
 * in Ollama — never needs a code change.
 */
export function createOllamaProvider(options: OllamaProviderOptions = {}): AIProvider {
  const baseUrl = options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
  const model = options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  return {
    id: "ollama",
    async *streamChat(messages: AIProviderMessage[], { signal }): AsyncGenerator<AIStreamChunk> {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama request failed (${response.status}): is Ollama running at ${baseUrl}?`);
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
            const parsed = JSON.parse(line) as OllamaChatChunk;
            yield { content: parsed.message?.content ?? "", done: parsed.done ?? false };
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
