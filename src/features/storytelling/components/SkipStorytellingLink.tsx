"use client";

import { useStorytellingStore } from "@/stores/storytelling-store";

/**
 * The brief's explicit "Skip storytelling" requirement — same `sr-only`-
 * until-focused convention `components/layout/SkipLink.tsx` already
 * established for "Skip to main content", a second real instance of the
 * same pattern rather than a new one. A native anchor jump (`href`), not a
 * JS-driven scroll — works even if GSAP/Lenis never finished initializing.
 * `skip()` additionally records the choice (emits `story:skipped`) for
 * whatever a future analytics/personalization consumer wants it for; the
 * actual navigation doesn't depend on that call succeeding.
 */
export function SkipStorytellingLink() {
  const skip = useStorytellingStore((state) => state.skip);

  return (
    <a
      href="#chapter-finale"
      onClick={() => skip()}
      className="bg-primary text-primary-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:ring-2 focus-visible:outline-none"
    >
      Skip storytelling
    </a>
  );
}
