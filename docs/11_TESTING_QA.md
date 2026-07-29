# 11 — Testing & QA

## Current stack

- **Vitest + React Testing Library** for unit/component tests — installed since Sprint 2.1, real from day one (not scaffolding-ahead-of-need). 150 tests across 26 files as of Sprint 2.6, covering every manager built since (registries, bridge stores, EventBus, resource/material/shader caches, adaptive quality hysteresis, engine health aggregation, etc.) plus `useCupInteractionState`/`usePrefersReducedMotion`.
- **Playwright** (`@playwright/test`) for e2e, cross-browser, and visual regression — installed Sprint 2.6, the point [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) flagged as "decided at sprint start based on what shipped": this sprint's own brief named Cross-browser Validation and Visual Regression Baseline as concrete deliverables, which need a real multi-engine browser runner, not just Vitest+jsdom. Three projects — Chromium, Firefox, WebKit (Playwright's own bundled engines; no macOS exists on this dev machine to run real Safari, and a system-installed Edge was spot-checked separately since Playwright drives it identically to Chromium). `e2e/stabilization.spec.ts` and `e2e/long-running.spec.ts`; screenshot baselines committed under `e2e/*.spec.ts-snapshots/`. See [reviews/sprint-2.6-review.md](reviews/sprint-2.6-review.md) for what's covered and what's deliberately not (real 30-minute soaks, repeated camera transitions/asset disposal — no feature surface exists for those two yet).

## Milestone 1 QA gate (superseded by the above for anything built since, kept here as the historical record of Milestone 1's foundation-only bar)

Foundation-only milestones are verified through:

1. `npx tsc --noEmit` — zero errors.
2. `npm run lint` — zero errors/warnings, no unexplained `eslint-disable`.
3. `next build` — completes clean; confirms `three`/`@react-three/*` are absent from the server-rendered `/` bundle (proves the SSR boundary from [01_ARCHITECTURE.md](01_ARCHITECTURE.md) actually holds).
4. A manual verification checklist covering: visual correctness in both themes, reduced-motion behavior, no-WebGL fallback, keyboard-only navigation, responsive/touch behavior, and an FPS spot-check — the full checklist lives with each milestone's plan and is re-run, not just written once.

## Why manual checks count as QA here

For a milestone whose entire deliverable is *how something looks, moves, and feels*, an automated assertion that a `<div>` exists proves far less than actually loading the page and using it. Automated tests are added where they add real signal (state logic, regression-prone pure functions) — not to hit a coverage number.

## Related

[06_CODING_STANDARDS.md](06_CODING_STANDARDS.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
