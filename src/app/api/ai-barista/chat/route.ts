import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAIProvider } from "@/features/ai-barista/lib/providers/registry";
import type { AIProviderMessage } from "@/features/ai-barista/lib/providers/types";

export const runtime = "nodejs";

interface ChatRequestBody {
  messages: AIProviderMessage[];
}

/**
 * Sprint 3.9, Task 4 — this project's first real backend endpoint (every
 * prior "AI" feature, `features/concierge/`'s recommendation engine, is a
 * pure synchronous function with no server round-trip at all — see that
 * module's own doc comment). Exists specifically so the browser never talks
 * to Ollama directly: `localhost:11434` is only meaningful from wherever
 * this Next.js server process itself runs, and proxying it server-side is
 * also what keeps the provider swappable (`getAIProvider()`) without the
 * client needing to know or care which backend is behind it — "no vendor
 * lock-in," enforced by the boundary, not just documented.
 *
 * Streams the provider's chunks straight through as newline-delimited JSON
 * — the same wire format Ollama itself uses, so
 * `useAiBaristaStream.ts`'s client-side parser is trivial and the provider
 * boundary doesn't need a second serialization format invented for it.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatRequestBody;
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const provider = getAIProvider();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.streamChat(body.messages, { signal: request.signal })) {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
          if (chunk.done) break;
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "The AI barista is unavailable right now.";
        controller.enqueue(encoder.encode(`${JSON.stringify({ content: "", done: true, error: reason })}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
