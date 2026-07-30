import type { Page } from "@playwright/test";

/**
 * Sprint 3.9, Task 1 added a first-run onboarding tour that auto-opens
 * (as a real, modal `Dialog`) shortly after landing on `/` for anyone who
 * hasn't completed or skipped it — genuinely correct product behavior for
 * a first-time visitor, but it means every pre-existing test that
 * navigates to `/` and immediately interacts with page content (the theme
 * toggle, the cup, etc.) needs to represent a *returning* visitor instead,
 * the same way a real person testing those other features would already
 * have dismissed the tour once. `page.addInitScript` seeds `localStorage`
 * before any app code runs on the next navigation, matching the exact
 * shape `stores/onboarding-store.ts`'s `persist` middleware writes.
 *
 * A dedicated `onboarding.spec.ts` tests the tour itself against a real,
 * un-seeded first-run state — this helper is for every *other* spec.
 */
export async function skipOnboardingTour(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("coffeshop-onboarding", JSON.stringify({ state: { hasCompletedOnboarding: true }, version: 0 }));
  });
}
