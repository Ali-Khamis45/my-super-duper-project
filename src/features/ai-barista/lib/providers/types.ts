export interface AIProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

/**
 * Sprint 3.9, Task 4 — the seam every AI backend implements, so the rest of
 * the feature (prompt building, the streaming UI, recommendation
 * extraction) never depends on a specific vendor. "No vendor lock-in.
 * Future providers must be pluggable" — the brief's own words; a second
 * provider is a new file implementing this interface plus one line in
 * `registry.ts`, nothing else changes. Server-side only: implementations
 * talk to a real backend (Ollama today), never imported by client code.
 */
export interface AIProvider {
  id: string;
  streamChat(messages: AIProviderMessage[], options: { signal?: AbortSignal }): AsyncGenerator<AIStreamChunk>;
}
