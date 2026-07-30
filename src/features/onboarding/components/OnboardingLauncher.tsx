"use client";

import { useEffect } from "react";

import { useOnboardingStore } from "@/stores/onboarding-store";

import { TutorialOverlay } from "./TutorialOverlay";

/** Gives the hero's 3D canvas a moment to actually mount before the tour's first spotlighted step tries to measure it — an instant auto-start would often spotlight a layout mid-shift. */
const AUTO_START_DELAY_MS = 900;

/**
 * Sprint 3.9, Task 1 — mounted only on `Hero.tsx`, not globally: every
 * spotlighted step targets a real element that only exists on `/` (see
 * `data/steps.ts`'s own doc comment on why this is a one-page tour). A
 * first-time visitor who lands on a different route first simply won't be
 * auto-prompted until they visit `/` — `Navbar`'s "Replay tour" button
 * (`ReplayTourButton.tsx`) is the always-available manual entry point
 * regardless of route.
 */
export function OnboardingLauncher() {
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const start = useOnboardingStore((state) => state.start);

  useEffect(() => {
    if (!hasHydrated || hasCompletedOnboarding) return;
    const timeout = window.setTimeout(start, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [hasHydrated, hasCompletedOnboarding, start]);

  return <TutorialOverlay />;
}
