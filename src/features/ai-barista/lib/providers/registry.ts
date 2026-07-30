import { createOllamaProvider } from "./ollamaProvider";
import type { AIProvider } from "./types";

let activeProvider: AIProvider | null = null;

/** Lazily constructed — reading `OLLAMA_BASE_URL`/`OLLAMA_MODEL` at first real use, not at module load, so a route that never calls this never pays for it. */
export function getAIProvider(): AIProvider {
  if (!activeProvider) activeProvider = createOllamaProvider();
  return activeProvider;
}

/** Sanctioned extension seam (docs/17_ZERO_REWRITE_POLICY.md) — a future provider calls this once and every existing call site is unaffected. Registry pattern, matching `engine/camera/presets.ts`'s own register/resolve convention. */
export function setAIProvider(provider: AIProvider): void {
  activeProvider = provider;
}
