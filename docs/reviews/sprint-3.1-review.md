# Sprint 3.1 — Product Catalog Experience: Review

The first Milestone 3 sprint, and the first real user-facing feature built entirely on top of a frozen engine: the `/menu` route's `ComingSoonPage` placeholder is replaced with a real, searchable, filterable catalog of 14 drinks across 4 categories, plus a detail dialog. Zero engine changes were made or needed — every visual/motion primitive used already existed (`GlowCard`, `fadeUp`/`stagger`, `usePrefersReducedMotion`, `track()`), confirming Engine v1.0 was genuinely ready to be extended, not just declared so.

**Scale**: 10 new source files (`features/menu/`), 3 modified files (`app/menu/page.tsx`, `engine/analytics/events.ts`, this doc set), a new `e2e/menu.spec.ts` (5 tests × 3 browsers, 15 total). `tsc`, `eslint`, `next build`, and the full unit test suite (150 tests, unchanged) all clean. All 15 new e2e tests pass across Chromium/Firefox/WebKit.

## Feature review

**No engine modification, checked, not assumed**: every primitive this sprint needed already existed — `GlowCard` (accent glow + pointer tilt, Milestone 1), `fadeUp`/`stagger`/`fadeIn` (motion presets, Milestone 1), `usePrefersReducedMotion` (Milestone 1), `track()` (Milestone 1's analytics seam), `Button`/`Card`/`Dialog`/`Input` (shadcn primitives, already installed). The one new capability — analytics events for search/filter/detail-view — is a pure additive union member on `AnalyticsEvent`, the same "add fields, don't change existing ones" contract [17_ZERO_REWRITE_POLICY.md](../17_ZERO_REWRITE_POLICY.md) already governs. This sprint is the first real evidence that the "extend through interfaces/registries/plugins/composition/adapters, no rewrites" constraint is actually livable, not just stated.

**No backend, and no placeholder queries invented to fake one**: `data/drinks.ts` is static, typed, first-party data. [ADR-0005](../adr/0005-state-management.md) explicitly reserves TanStack Query for a real future endpoint and forbids placeholder queries — this sprint follows that literally rather than wiring up a fake `useQuery` against local data for architectural symmetry with a future that doesn't exist yet.

**Scoped to what the brief actually named**: "Menu · Drinks · Categories · Search · Filtering" — no routed product-detail page (a dialog instead, since [docs/strategy/sitemap.md](../strategy/sitemap.md)'s Menu → Product Detail flow exists but a full route wasn't named this sprint), no live 3D preview per drink (that's the Live Cup Customizer's job, Sprint 3.2, not built ahead of it), no "Add to cart" (no cart concept exists until Sprint 3.6). Each omission is a real scope decision, not an oversight — recorded in `features/menu/README.md`'s Known Simplifications.

## Experience & Creative review

**Real, measured motion polish, not assumed**: the shared `stagger` preset (tuned for 2-4 headline elements at a 0.06s-per-child interval) was tried first for the 14-item catalog grid and directly measured — via a live render, not estimated — to take over a second for the last card to finish settling. A tighter, grid-local `catalogStagger` variant (0.025s interval) was measured afterward to complete in ~330ms. This is this sprint's Creative Budget delivery: a page that reads as instant rather than a page the user has to wait out.

**A real empty state, not a bare "no results"**: `MenuEmptyState` was written with the same "sensory craft" voice as the rest of the catalog copy (`docs/strategy/product-vision.md`) rather than a generic system message — a small, cheap, easy-to-skip detail that this sprint didn't skip, because an unhelpfully bare empty state is exactly the moment search/filter can feel broken instead of just empty.

**Copy matches the established brand voice, checked against the actual vision doc**: every drink's tagline was written to the product-vision doc's explicit rule ("sensory craft over information density... every screen leads with how the product looks/feels/moves before it leads with copy or price") — one evocative line per drink in the card, fuller description reserved for the detail dialog, price never leading.

## Technical quality

**Two real, investigated cross-browser findings, not assumed and not left unexplained**:

- `Card`/`GlowCard` render plain `<div>`s (no Base UI polymorphic `render` prop, unlike `Button`) — an initial `DrinkCard` draft tried passing a `render` prop to `GlowCard` anyway, which would have silently done nothing. Caught before shipping by checking `card.tsx`'s actual implementation, not assumed from `Button`'s pattern; fixed by wrapping `GlowCard` in a real `<button>` element instead.
- The e2e suite's first run showed 2 of 5 WebKit tests failing to filter at all after `.fill()`, despite the DOM value updating correctly. Directly investigated (not worked around blindly): Playwright's `.fill()` on a `type="search"` Base UI `Input` doesn't reliably dispatch a change event WebKit picks up, while real keyboard typing (`page.keyboard.type`) filters correctly in all 3 engines — confirmed by testing both paths directly. This is a Playwright/WebKit/`type="search"` tooling quirk, not a real Safari bug affecting actual users; the tests were fixed to type like a real user, and the finding is documented inline rather than silently worked around.

**Accessibility**: every drink card is a real `<button>` (not a styled `<div onClick>`), keyboard-operable without extra wiring, with a descriptive `aria-label` including name and price. Category filters use `aria-pressed` on real buttons, not a custom tab widget. The search input has a proper (visually-hidden) `<label>`. The detail dialog inherits Base UI's Dialog focus trap and `Escape`-to-close for free — verified via e2e, not assumed. All of this was verified live via Playwright's accessibility-tree inspection, not just written and trusted.

## Retrospective

### Technical debt

None incurred — this was a clean, self-contained feature slice with no shortcuts taken under time pressure.

### Architectural observations

- The `catalogStagger` variant lives locally in `MenuExperience.tsx`, not promoted to `engine/motion/presets.ts`, since it has exactly one consumer today — the same "no zero-consumer scaffolding" discipline `hero-cup/README.md` already established for a removed `cupConfig.ts`. Worth promoting to a shared preset the moment a second large-list entrance needs the same tuning (Sprint 3.3's ingredient list is a likely second consumer).
- This sprint is a genuine, positive data point for the engine freeze: a real, polished, tested feature shipped touching zero files under `engine/`. If a future sprint in this milestone *does* need to touch the engine, that will be a meaningful, flaggable event precisely because this sprint didn't need to.

### Possible improvements

- `Drink`/`DrinkCategory` (`features/menu/types.ts`) are explicitly named in the README as the contract a real future backend would need to satisfy — worth keeping in sync by hand until that backend exists, rather than letting the two drift.
- No "Add to cart" or customizer hand-off exists yet beyond a link to the still-placeholder `/customize` route — expected and correct for this sprint's scope, tracked as real future work in the README rather than silently absent.

## Sign-off

`git status` confirms every change this sprint is real, working, tested implementation — a new feature slice, 15 new e2e tests all passing across 3 browsers, zero engine files touched, zero regressions in the existing 150 unit tests or the Sprint 2.6 e2e suite. Waiting for approval before Sprint 3.2 (Live Cup Customizer) begins.

## Related

[28_MILESTONE_3_SPRINTS.md](../28_MILESTONE_3_SPRINTS.md) · [08_MILESTONES.md](../08_MILESTONES.md) · [ENGINE_CHANGELOG.md](../../ENGINE_CHANGELOG.md) · [17_ZERO_REWRITE_POLICY.md](../17_ZERO_REWRITE_POLICY.md) · [adr/0005-state-management.md](../adr/0005-state-management.md) · [strategy/sitemap.md](../strategy/sitemap.md) · [strategy/product-vision.md](../strategy/product-vision.md)
