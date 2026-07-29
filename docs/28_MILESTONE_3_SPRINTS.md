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

## Sprint 3.2 — Interactive Cup Designer *(complete — see [reviews/sprint-3.2-review.md](reviews/sprint-3.2-review.md))*

| | |
|---|---|
| Builds | `/customize` — real Color/Size/Sleeve/Lid/Logo/Material variants live-updating the 3D cup, preview-before-commit (hover/focus previews, click/Enter commits), Undo/Redo/Reset, session-only preset saving (`stores/customizer-store.ts`, sessionStorage-persisted) · `features/customizer/` (data catalogs, `resolvePartOverrides`, panel components) · `CupAssembly`/`CupScene`/`CupCanvas`/`CupCanvasLoader` extended with optional, backward-compatible `partOverrides`/`cupScale` props · `ProceduralCup`/`Sleeve`/`Lid` re-routed through the existing material cache with a richer key (`materialOverridesToVariant`) instead of always constructing one-off materials · 5 new EventBus events (`customizer:opened`/`-closed`, `variant:selected`, `preset:applied`, `preset:reset`) |
| Depends on | Sprint 2.3's `materialOverrides`/`colorway` on `CupPartProps` (typed since then specifically for this sprint), Sprint 3.1 (the `DrinkDetailDialog`'s "Customize this drink" CTA needs a real destination) |
| Test independently | `npx playwright test e2e/customizer.spec.ts` — 10 tests × 3 browsers: load/no-errors, click-to-select, undo/redo/reset, none-variants (sleeve/lid/logo), preset save+load round-trip, keyboard commit, touch tap, reduced motion, 44px touch targets. Hero route's own full e2e suite (including pixel-diff visual regression) re-run and passed 12/12, confirming zero regression |
| Creative budget | Delivered: preview-before-commit *is* the delight, not a separate flourish — hovering/focusing a swatch shows the cup update live and revert cleanly, the mechanism this sprint's "smooth material blending" and "selection feedback" requirements both actually meant |

## Sprint 3.3 — Drink Composer *(complete — see [reviews/sprint-3.3-review.md](reviews/sprint-3.3-review.md))*

| | |
|---|---|
| Builds | `features/composer/` — a 9-ingredient catalog (Foam/Cream/Chocolate/Caramel/Cinnamon/Sprinkles/Ice/Milk/Syrup) each with `compatibleWith: DrinkCategoryId[] \| "all"` for the brief's "strict rules" ("can't add ice to a hot espresso drink," etc., enforced at every entry point — click, drag, and preset), 4 curated presets, `resolveIngredientLayers` (pure, unit-tested), Ingredient Library (click + native-HTML5 drag-to-add, hover/focus preview), Layer Stack (quantity +/-, up/down reorder, remove — deliberately buttons, not drag-reorder, for free keyboard/touch support), Recipe Summary (drink name/category/ingredients/per-item and total pricing), `IngredientAnnouncer` (`aria-live="polite"` screen-reader announcements) · `stores/customizer-store.ts` extended with `ingredients`/`baseDrinkId`/`baseDrinkCategory` and 6 new actions, all through the existing undo/redo history · 2 new cup-part registry entries (`ingredient-ring`, `ingredient-sprinkles` — one shared torus shape for 8 of 9 ingredients, sprinkles alone gets real `InstancedMesh` geometry) reusing the material cache from the start · a new `"ingredient"` `MaterialSurface` · `/customize?drink=<id>` real routing from the menu's "Customize this drink" CTA · 5 new EventBus events (`ingredient:added`/`-removed`/`-updated`/`-reordered`, `recipe:changed`) plus the real first implementation of the previously-dormant `ingredient:dropped` |
| Depends on | Engine v1.0's registry/material-cache patterns (Sprint 2.3), Sprint 3.2's `CustomizerSelection`/undo-redo/preview mechanism (extended, not duplicated), Sprint 3.1's `resolveDrink` (added this sprint to close the loop Sprint 3.1 left open) |
| Test independently | `npm run test` — 39 new unit tests (store ingredient actions, `resolveIngredientLayers`, `isIngredientCompatible`, `resolveDrink`; 199 total project-wide, 32 files). `npx playwright test e2e/composer.spec.ts` — 16 tests × 3 browsers: render/no-errors, drink-id routing, strict compatibility rules on two different base categories, preset filtering, click-to-add, duplicate-add prevention, quantity, reorder, remove, preset apply, undo/redo, screen-reader announcements, keyboard, touch, reduced motion. Full e2e suite re-run for regression (see review for two pre-existing, unrelated flakes found and documented, not hidden) |
| Creative budget | Layer height/scale respond to stack position and quantity (`resolveIngredientLayers`'s `LAYER_SPACING`/quantity-scale), all real geometry stacking, not a static list; hover-preview-before-commit reused from Sprint 3.2 rather than re-invented for ingredients |

**Real-browser verification note**: this sprint's implementation-phase manual verification hit a genuine, extensively investigated environmental instability in this dev machine's long-running SwiftShader-backed headless Chromium (see the review's Performance Review section) — root-caused as environmental, not a code defect, since it reproduced identically on unrelated, untouched code. The final Playwright e2e run (used for this sprint's actual pass/fail record) was unaffected.

## Sprint 3.4 — Liquid & Physics Experience *(complete — see [reviews/sprint-3.4-review.md](reviews/sprint-3.4-review.md))*

| | |
|---|---|
| Builds | `engine/physics/` — a new, small engine module (`liquidPhysics.ts`'s `stepLiquidPhysics`/`triggerRipple`, pure and fully unit-tested for determinism) implementing the lightweight spring-damper "not a physics engine" simulation [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) and [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) designed two sprints ago: tilt (spring-damped from the cup's rotation velocity), a 4-slot ripple array (deterministic golden-angle origins, triggered on drag-start/release), and foam/ice as slower spring followers of the same tilt signal (independently lagged secondary motion) · `features/hero-cup/hooks/useLiquidPhysics.ts` (the single `useFrame` owner, emitting the 4 new settle-transition events) · `useCupInteractionState` gained the planned `velocityRef` field (plus a keyboard-rotation velocity impulse, for interaction parity) · `engine/shaders/coffee/liquidDeformation.ts` + `foam/foamLagDeformation.ts` (real vertex-shader displacement via `onBeforeCompile`, composed alongside the existing Sprint 2.4 fresnel rim rather than replacing it) · `ProceduralIngredientIce.tsx` (a new registry entry — same shared ring geometry, genuinely different float/drift behavior) · `engine/performance/qualityPolicy.ts`'s `coffeePhysicsQuality: "off" \| "full"` reshaped into a graded, never-zero `coffeePhysics` policy (its first real consumer) · 4 new EventBus events (`physics:started`/`-settled`, `liquid:disturbed`/`-stabilized`) |
| Depends on | Sprint 2.4's Shader Manager/`onBeforeCompile` convention and the Architecture Freeze's pre-designed "Coffee Liquid Physics" scenario (built to that design, not improvised), Sprint 2.5's `QualityPolicy` table (`coffeePhysicsQuality` was typed there specifically for this moment), Sprint 3.3's ingredient registry pattern (extended the same way for ice) |
| Test independently | `npm run test` — 20 new unit tests (`engine/physics/liquidPhysics.test.ts`'s determinism/convergence/settle-ordering/quality-scaling coverage, `qualityPolicy.test.ts`'s never-zero/monotonic-scaling coverage, `resolveIngredientLayers.test.ts`'s ice-routing case; 219 total project-wide, 33 files). `npx playwright test e2e/physics.spec.ts` — 7 tests × up to 3 browsers (the long-running soak is Chromium-only, matching `long-running.spec.ts`'s existing precedent): drag/release, repeated disturb cycles, keyboard-driven physics parity, ice float, touch, reduced motion, a scaled-down long-running soak |
| Creative budget | Delivered: the cup keeps a small, real amount of liquid inertia after a fast drag-release, foam visibly lags a beat behind the liquid's own tilt, and ice (when present) drifts independently — "motion feels expensive, not exaggerated," per the brief's own framing, achieved with zero new dependencies and a maximum tilt bounded at ~5° |

**Real-browser verification note**: manual implementation-phase verification (drag, keyboard, touch, reduced motion, ice ingredient) produced zero console/page errors across every path, run in a fresh session unaffected by the SwiftShader instability Sprint 3.3's review documented. Two pre-existing, unrelated e2e flakes were re-confirmed (not newly introduced) during this sprint's full regression run — see the review's Performance Review section.

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
