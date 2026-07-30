# ai-barista

The AI Barista — a floating, conversational chat widget available on every route, backed by a real local LLM via [Ollama](https://ollama.com), not a placeholder. Talks like a barista (mood, energy, sweetness, caffeine, hot/iced), and once it understands the guest, hands off to a deterministic, real, explainable recommendation — the exact same engine `features/concierge/` already uses — ending in a single "✨ Customize This Drink" button. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Known simplifications, Future extension.

## Architecture

```
ai-barista/
├── components/
│   ├── AiBaristaLauncher.tsx   floating button + Sheet wrapper, mounted once in app/layout.tsx
│   ├── AiBaristaChat.tsx       the chat window: message list, input, cancel/retry
│   ├── MessageBubble.tsx       renders one message; runs extraction on completed assistant turns
│   ├── RecommendationCard.tsx  the "Customize This Drink" handoff card
│   ├── TypingIndicator.tsx     three-dot "thinking" indicator
│   └── AiBaristaSteam.tsx      ambient 2D steam wisp (header + floating button)
├── hooks/
│   ├── useAiBaristaChat.ts     orchestration: store + stream + events
│   └── useAiBaristaStream.ts   low-level NDJSON fetch/parse/cancel
├── lib/
│   ├── providers/
│   │   ├── types.ts            AIProvider interface — the vendor-agnostic seam
│   │   ├── ollamaProvider.ts   the only implementation this sprint
│   │   └── registry.ts         get/setAIProvider — the pluggable-provider seam
│   ├── promptBuilder.ts        barista persona + real menu/ingredient catalog + protocol
│   ├── extractTasteProfile.ts  parses the model's structured handoff block
│   ├── detectMentionedDrink.ts a cheap prose/recommendation-agreement nudge
│   └── renderMarkdown.tsx      small, dependency-free markdown renderer
└── types.ts
```

`src/app/api/ai-barista/chat/route.ts` — this project's **first real backend endpoint**. `features/concierge/`'s own recommendation engine is explicitly documented as "not an LLM call... this project has no backend"; this sprint is the first genuine exception, and only because the brief explicitly required a real model, not a placeholder. The route exists so the browser never talks to Ollama directly (`localhost:11434` is only meaningful from wherever the Next.js server itself runs) and so the provider stays swappable server-side without the client needing to know or care.

Conversation state lives in `stores/ai-barista-store.ts` (project-root `stores/`, the same convention `customizer-store.ts`/`concierge-store.ts` established) — `sessionStorage`-persisted, matching every sibling store's "session only" policy.

## Why a hybrid, not a pure LLM recommendation

The model is trusted for conversation and for naming a drink in its own warm prose (the brief wants that — "explain WHY"). It is **never** trusted as the sole source of the actual recommendation. Whenever it's ready, it ends its message with a fenced `` ```profile `` block — a `TasteProfile` (the exact shape `features/concierge/types.ts` already defines), not a drink id. That profile is fed straight into `generateRecommendation`, the same deterministic, unit-tested engine `features/concierge/` uses, which picks the actual drink from the real catalog. "Never hallucinate menu items... always map to real menu IDs" is enforced by this boundary in code, not just requested in the system prompt — malformed/missing/out-of-range fields fall back to a neutral default (`extractTasteProfile.ts`), never crash, never get passed through unchecked.

A real, observed consequence of this split during manual verification: across a multi-turn conversation, the model at one point suggested a hot seasonal drink in prose despite the guest having said "iced" several turns earlier — a real small-local-model consistency slip. The deterministic engine, reasoning only from the model's own latest structured summary (which still correctly said `"temperature":"iced"`), recommended a real iced cold-brew instead. The hybrid design's whole point is exactly this: the engine can't inherit the model's mid-conversation drift, because it never sees the conversation, only the model's own final, structured account of it. `lib/detectMentionedDrink.ts` narrows the gap further (a cheap prose-mention → category hint, never a trust boundary) but doesn't erase it — prose and card can still legitimately disagree, and when they do, the card is correct by construction.

## Flow

1. `AiBaristaLauncher` mounts a floating button (`Sheet`'s `SheetTrigger`, Base UI's Dialog — the same primitive `MobileMenu` already uses, real focus-trap/Escape/backdrop-dismiss for free, "no duplicated overlay logic").
2. `AiBaristaChat` sends a message via `useAiBaristaChat`'s `send()`, which appends it to `ai-barista-store`, builds the full provider-message list (`promptBuilder.ts`'s system prompt + history) and streams the reply through `useAiBaristaStream` → `POST /api/ai-barista/chat` → `getAIProvider()` (the Ollama adapter) → Ollama's real `/api/chat`.
3. Each NDJSON chunk appends to the in-progress assistant message (`appendToAssistantMessage`) — a single stable message object, not a new one per chunk, so React reconciliation stays cheap while text streams in.
4. On completion, `MessageBubble` runs `extractTasteProfile` once (memoized on the finished message's content) — if a valid profile was found, `generateRecommendation` produces a real `Recommendation`, rendered as a `RecommendationCard` below the bubble.
5. "Customize This Drink" calls `concierge-store`'s existing `applyRecommendationToCustomizer` (verbatim — not reimplemented) and navigates to `/customize?drink=<id>`, the identical handoff `RecommendationPanel`'s own "Apply to Customizer" button already uses. Verified live, end to end, against a real Ollama instance during this sprint: conversation → recommendation → customizer, with the suggested ingredients pre-applied and priced correctly.
6. `cancel()` aborts the in-flight fetch (`AbortController`); `retry()` drops a failed assistant turn and resends the same history.

## Responsibilities

- **This feature owns**: the conversation UI/state, the provider abstraction, the Ollama adapter, the prompt/protocol, and the structured-block extraction.
- **This feature borrows from `features/concierge/`**: `generateRecommendation` and the `TasteProfile`/`Recommendation` types — the actual recommendation logic, never reimplemented.
- **This feature borrows from `stores/concierge-store.ts`**: `applyRecommendationToCustomizer`, called directly for the customizer handoff.
- **This feature borrows from `features/menu/` and `features/composer/`**: the real `drinks`/`INGREDIENTS` catalogs, both for prompt grounding and for `detectMentionedDrink.ts`'s matching.
- **This feature does not own**: the customizer's state, the recommendation-scoring rules, or the 3D cup — all read from their owning feature.

## Known simplifications

- The `` ```profile `` protocol is steered by prompt instructions, not guaranteed by the model — an 8B local model sometimes includes it earlier than "ready" (per the brief's own "usually after 2-4 exchanges"), and sometimes the guest-facing prose and the extracted profile drift, as described above. Never a correctness problem (the card is always real/explainable), only a UX-polish ceiling inherent to a small local model — a real, larger-model or hosted provider (swappable via `lib/providers/registry.ts`, no other code changes) would likely follow the protocol more consistently.
- `renderMarkdown.tsx` covers bold/italic/inline-code/lists/fenced-code-blocks — the real surface a short conversational reply needs — not a full CommonMark implementation. No external markdown dependency added for it.
- Code blocks render into a real `<pre><code data-language>` structure with no syntax highlighter wired in yet (no current consumer needs one — the barista's replies are prose, not code) — "future-proof" per the brief means the structure is ready, not that highlighting is implemented today.
- No conversation summarization/windowing — the full session history is replayed to the model every turn. Fine at this project's conversation lengths; a long-running session would eventually need one.

## Future extension

- **A second provider**: implement `AIProvider` (`lib/providers/types.ts`) against any other backend and call `setAIProvider()` once — every other file in this feature is unaffected, per the brief's own "no vendor lock-in."
- **Streaming markdown syntax highlighting**: `renderMarkdown.tsx`'s code-block branch already emits a `data-language` attribute; a highlighter is a local addition to that one function, not a rearchitecture.
- **A real conversation-length limit/summarizer**, once a session genuinely needs one.
