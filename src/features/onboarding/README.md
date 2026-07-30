# onboarding

A first-run, 8-step spotlight tour on `/` (`localStorage`-remembered completion via `stores/onboarding-store.ts`) — Welcome, Rotate the cup, Zoom and inspect, Open Menu, Customize drinks, AI Barista, Checkout experience, Story Mode. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Known simplifications, Future extension.

## Architecture

```
onboarding/
├── components/
│   ├── OnboardingLauncher.tsx   auto-starts for first-time visitors, mounted only in Hero.tsx
│   ├── TutorialOverlay.tsx      the orchestrator: Dialog.Root + spotlight mask + card + keyboard/swipe
│   ├── SpotlightMask.tsx        the SVG-masked backdrop with a cutout "hole" around the target
│   ├── TutorialArrow.tsx        the animated pointer arrow
│   ├── ProgressDots.tsx         reusable step indicator
│   └── ReplayTourButton.tsx     the Navbar's manual "?" entry point, works from any route
├── data/steps.ts                the 8 steps, each with a `data-onboarding="<id>"` target selector
└── types.ts
```

`stores/onboarding-store.ts` (project-root `stores/`, matching every sibling feature store's convention) — `localStorage`-persisted (not `sessionStorage`, unlike every other Sprint 3.x feature store: "remembered across visits" needs to survive a closed browser, the same reasoning `cart-store.ts` already established for its own `localStorage` choice). Only `hasCompletedOnboarding` is persisted; `isActive`/`stepIndex` are ephemeral.

## Why one page

The brief's 8 steps span concepts that live on different routes (Menu, Customize, AI Barista, Checkout, Story Mode) — but the tour never navigates away from `/`. Every step instead spotlights a real element that's already visible there: the Navbar's own links to those routes, the AI Barista's floating button, the cart icon. This is a deliberate, common "product tour" pattern (Notion/Linear/Arc all do this) — teaching "what's where" without forcing a disruptive multi-page walkthrough, and without needing the tutorial engine to survive route transitions. A first-time visitor who lands on a different route before `/` simply isn't auto-prompted until they visit it — `ReplayTourButton` (in the Navbar, works from any route) is the always-available manual entry point.

## Flow

1. `OnboardingLauncher` (mounted only in `Hero.tsx`) waits for the store to finish hydrating (`hasHydrated` — `zustand/persist`'s own rehydration is asynchronous even for `localStorage`, so a returning visitor's `hasCompletedOnboarding: true` isn't necessarily applied on the very first client render) and, if `!hasCompletedOnboarding`, auto-starts after a short delay (letting the hero's 3D canvas actually mount first).
2. `TutorialOverlay` composes `@base-ui/react/dialog`'s real `Root`/`Portal`/`Popup`/`Title`/`Description` directly — real focus-trap, Escape-to-close (wired to `skip()`), and `role="dialog"` ARIA semantics, the same primitive `components/ui/sheet.tsx` already wraps. `SpotlightMask` (a custom SVG backdrop with a cutout hole, not Base UI's own solid `Backdrop`) and `TutorialArrow` render as siblings inside the same `Portal`, ahead of `Popup` in paint order.
3. Each step's `targetSelector` (a `data-onboarding="<id>"` attribute already on the real element) is measured via `useLayoutEffect` (synchronous, before paint — avoids a visible flash of the wrong position on a step change) into a `DOMRect`, which both the spotlight hole and the card's own position (`computeCardStyle`, placement-aware, clamped to stay on-screen) are computed from.
4. Skip/Previous/Next are real buttons; ←/→ arrow keys and left/right swipe (via `engine/interaction/useGestureRecognizer.ts`'s existing gesture vocabulary) both advance/retreat the same way.
5. `skip()`/`complete()` both set `hasCompletedOnboarding: true` — skipping counts as "seen it," matching every real product tour's own convention, not just finishing.

## Responsibilities

- **This feature owns**: the tour's own state, steps, spotlight/card/arrow rendering, and the replay affordance.
- **This feature borrows from `engine/interaction/useGestureRecognizer.ts`**: its `"wheel"` gesture's sibling `drag-start`/`drag-end` events for swipe — this hook's first real production consumer since being built in Milestone 1.
- **This feature borrows from `engine/performance`**: `performanceManager.tier` to skip the spotlight's decorative glow pulse on the two lowest quality tiers.
- **This feature does not own**: any of the elements it spotlights — every `data-onboarding` attribute lives on the owning feature's own component (`HeroCupViewport`, `CupZoomControls`, `NavLinks`, `AiBaristaLauncher`, `CartIcon`), added as a small, additive, optional prop/attribute, never a fork.

## Known simplifications

- No dedicated e2e spec (`e2e/onboarding.spec.ts`) automating the tour itself yet — verified via direct manual Playwright automation during Sprint 3.9 (steps, keyboard nav, swipe, Skip/Finish, persistence, replay), not committed as a standing repeatable spec. See `docs/reviews/sprint-3.9-review.md`'s Known Limitations.
- The spotlighted "cup-canvas" target is a small, roughly-centered marker div, not the cup's real (WebGL, no DOM bounding box) silhouette — an intentional approximation, not meant to track the live 3D bounding box exactly.

## Future extension

- **Per-route steps**: if a future tour genuinely needs to spotlight something on another route, `OnboardingStep.targetSelector`/`placement` already generalize to that — the one-page constraint is a Sprint 3.9 scope decision, not a structural limit of the data shape.
- **A second, later tour** (e.g., a "what's new" tour for a future release) is a second `data/steps.ts`-shaped array and a second store instance away — `TutorialOverlay`'s components take no onboarding-specific data by name, only the shape.
