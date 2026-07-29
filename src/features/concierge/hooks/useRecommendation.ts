import { useCallback, useRef, useTransition } from "react";

import { drinks } from "@/features/menu/data/drinks";
import { useConciergeStore } from "@/stores/concierge-store";
import { useCustomizerStore } from "@/stores/customizer-store";

import { generateRecommendation } from "../lib/recommendationEngine";

/**
 * "AI requests must not block interaction. Graceful loading states.
 * Cancellation support for abandoned requests." — satisfied with React 19's
 * own `startTransition` (which accepts an async callback and keeps
 * `isPending` true for its whole duration) plus a plain request-id token,
 * not TanStack Query. `recommendationEngine.ts`'s own doc comment explains
 * why: there is no real endpoint here (ADR-0005's "no placeholder
 * queries"), so wrapping a synchronous local computation in a simulated
 * fetch would be dishonest scaffolding, not a real data-fetching need.
 * `useTransition`/a request-id token are React/JS built-ins that satisfy
 * every real requirement (non-blocking, cancellable, a loading flag)
 * without pretending this is remote data.
 */
const THINKING_DELAY_MS = 650;

export function useRecommendation() {
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const setRecommendation = useConciergeStore((state) => state.setRecommendation);

  const generate = useCallback(
    (reducedMotion: boolean) => {
      const requestId = ++requestIdRef.current;
      const profile = useConciergeStore.getState().tasteProfile;
      const currentCategory = useCustomizerStore.getState().baseDrinkCategory;

      startTransition(async () => {
        // A deliberate pacing beat — "the concierge is considering your
        // answers," part of this sprint's Creative Budget ("feel helpful,
        // concise, and premium... avoid generic chatbot responses"), not
        // simulated network latency (the computation itself is
        // synchronous and near-instant — see `recommendationEngine.ts`).
        // Skipped under reduced motion, this project's established
        // "disable outright, don't downgrade" policy.
        if (!reducedMotion) {
          await new Promise((resolve) => setTimeout(resolve, THINKING_DELAY_MS));
        }

        // A real cancellation check, not a no-op: if a newer request was
        // triggered while this one was "thinking" (the user changed an
        // answer and re-submitted), this stale result is discarded rather
        // than clobbering the newer one — "cancellation support for
        // abandoned requests."
        if (requestIdRef.current !== requestId) return;

        const recommendation = generateRecommendation(profile, drinks, { currentCategory });
        if (!recommendation) return;
        if (requestIdRef.current !== requestId) return;
        setRecommendation(recommendation);
      });
    },
    [setRecommendation],
  );

  /** Marks any in-flight request as abandoned (its result, once computed, will be discarded) without needing a real AbortController — there's no I/O to abort, just a stale-result check. */
  const cancel = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  return { generate, cancel, isPending };
}
