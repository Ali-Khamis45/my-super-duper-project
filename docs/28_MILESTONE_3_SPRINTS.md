# 28 — Milestone 3 Sprints (Experience Layer)

Mirrors [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)'s format for Milestone 2, scoped to Milestone 3. Built on Engine v1.0 (`v1.0.0-engine`, [ENGINE_CHANGELOG.md](../ENGINE_CHANGELOG.md)), now frozen: every sprint below extends the engine through interfaces, registries, plugins, composition, and adapters — no engine rewrites, no breaking changes. If a feature seems to need an engine change, the sprint's own review must first prove extension is impossible before any ADR proposing one gets written.

**Implementation philosophy, stated in the brief and worth repeating here**: users should never notice the engine — only the delight it enables. Every sprint must produce something a user can touch, interact with, and remember. Motion, lighting, micro-interactions, sound, storytelling, and delight are first-class features, not polish bolted on at the end — the Creative Budget rule that started in Milestone 2 continues here, but the bar moves from "did engineering excellence increase" (assumed now) to "did emotional impact increase."

Documentation follows working code, same as Milestone 2 from Sprint 2.1 onward — this doc's entries below Sprint 3.1 stay sketch-level until their own sprint starts.

## Sprint 3.1 — Product Catalog Experience *(complete — see [reviews/sprint-3.1-review.md](reviews/sprint-3.1-review.md))*

| | |
|---|---|
| Builds | `features/menu/` — static, typed catalog data (`data/{drinks,categories}.ts`, 14 drinks × 4 categories, no backend exists, ADR-0005's "no placeholder queries" rule) · `MenuExperience.tsx` (search + category filter, `useState`/`useMemo` derivation, no state machine needed) · `DrinkCard`/`CategoryFilter`/`MenuSearch`/`DrinkDetailDialog`/`MenuEmptyState` · 3 new analytics events (`menu_searched`, `menu_category_filtered`, `menu_drink_viewed`) · a real `e2e/menu.spec.ts` (5 tests × 3 browsers, reusing Sprint 2.6's Playwright harness) |
| Depends on | Engine v1.0 (`GlowCard`, motion presets, `usePrefersReducedMotion`, `track()`) — zero engine changes made or needed |
| Test independently | `npx playwright test e2e/menu.spec.ts` — page load/no-console-errors, search narrows results, unmatched search shows the empty state (not a blank grid), category filter narrows + marks itself active, drink selection opens a real detail dialog |
| Creative budget | A tightened, grid-specific stagger entrance (measured live: the shared header stagger preset would have taken ~1.1s to settle for 14 items; a local, faster variant settles in ~330ms) — real, measured motion polish, not assumed |

## Sprint 3.2 — Live Cup Customizer

| | |
|---|---|
| Builds | Color / Sleeve / Lid / Logo / Materials — live-updating selections wired to the 3D cup via `engine/materials`' existing `getOrCreateMaterial`/`updateMaterialParams` (no new material system — Sprint 2.3 built exactly this for a future consumer) |
| Depends on | Sprint 3.1 (the `DrinkDetailDialog`'s "Customize this drink" CTA needs a real destination) |
| Test independently | TBD at sprint start |
| Creative budget | TBD at sprint start |

## Sprint 3.3 — Ingredient Builder

Drag & Drop · Chocolate · Caramel · Cinnamon · Cream · Sprinkles. Not yet started; full plan written at sprint start.

## Sprint 3.4 — Physics Layer

Coffee Surface · Liquid Motion · Ingredient Physics. Not yet started; full plan written at sprint start.

## Sprint 3.5 — AI Barista

Preferences · Taste Profile · Recommendations · History. The first feature needing real async data-fetching — [08_MILESTONES.md](08_MILESTONES.md)'s old Milestone 7 entry already flagged this as a known gap requiring a short TanStack Query design pass at sprint start, not a retrofit under pressure. Not yet started.

## Sprint 3.6 — Commerce Experience

Cart · Checkout · Payment · Order Tracking. Not yet started; full plan written at sprint start.

## Sprint 3.7 — Cinematic Storytelling

Scroll · Camera · Transitions · Scene Changes. Not yet started; full plan written at sprint start.

## Sprint 3.8 — Final Polish

Awwwards-bar pass across everything shipped in Milestone 3: motion, accessibility, performance, and the cumulative Creative Director Review. Not yet started.

## Related

[16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) · [08_MILESTONES.md](08_MILESTONES.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [ENGINE_CHANGELOG.md](../ENGINE_CHANGELOG.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
