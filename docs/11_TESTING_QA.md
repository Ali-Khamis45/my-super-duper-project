# 11 — Testing & QA

## Target stack (adopted once there's interactive logic worth testing)

- **Vitest + React Testing Library** for unit/component tests — hooks (`useCupInteractionState`, `usePrefersReducedMotion`), pure logic (registries, token derivation), and component behavior that doesn't require a real WebGL context.
- **Playwright** for e2e and visual regression — full page flows once there are multiple real routes, and visual snapshots of the `/design-system` reference page to catch unintended token drift.

Neither is installed yet. Installing a test framework with zero tests to run is itself dead scaffolding — against the same principle that keeps `audio/`/`commerce/` folders out of the repo this milestone (see [01_ARCHITECTURE.md](01_ARCHITECTURE.md)). The stack is decided now so there's no ambiguity when the first real test is warranted, likely Milestone 3–4 once `useCupInteractionState` and customizer logic exist as pure, testable state.

## Milestone 1 QA gate

Foundation-only milestones are verified through:

1. `npx tsc --noEmit` — zero errors.
2. `npm run lint` — zero errors/warnings, no unexplained `eslint-disable`.
3. `next build` — completes clean; confirms `three`/`@react-three/*` are absent from the server-rendered `/` bundle (proves the SSR boundary from [01_ARCHITECTURE.md](01_ARCHITECTURE.md) actually holds).
4. A manual verification checklist covering: visual correctness in both themes, reduced-motion behavior, no-WebGL fallback, keyboard-only navigation, responsive/touch behavior, and an FPS spot-check — the full checklist lives with each milestone's plan and is re-run, not just written once.

## Why manual checks count as QA here

For a milestone whose entire deliverable is *how something looks, moves, and feels*, an automated assertion that a `<div>` exists proves far less than actually loading the page and using it. Automated tests are added where they add real signal (state logic, regression-prone pure functions) — not to hit a coverage number.

## Related

[06_CODING_STANDARDS.md](06_CODING_STANDARDS.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
