# concierge

The AI Coffee Concierge at `/concierge`: a preference questionnaire, a real explained recommendation (drink, reasoning, confidence, suggested customizations, alternatives), and one-click apply to the customizer. "AI" here means a deterministic, fully explainable rule engine over the real menu catalog — not an LLM call; see `lib/recommendationEngine.ts`'s own doc comment for why. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
concierge/
├── components/
│   ├── ConciergeExperience.tsx    top-level composition, focus management
│   ├── ConciergeCanvas.tsx        wires cameraPreset + ingredientLayers reveal + zoom controls
│   ├── PreferenceQuestionnaire.tsx  the 8-question form
│   ├── PreferenceOptionGroup.tsx  named-choice radiogroup control
│   ├── PreferenceScale.tsx        1-5 scale control (sweetness/bitterness)
│   ├── RecommendationPanel.tsx    top pick + reasoning + confidence + apply
│   ├── DrinkComparison.tsx        ranked alternatives, each with its own reasons
│   └── RecommendationAnnouncer.tsx  sr-only aria-live region
├── data/questions.ts              question catalog + real-date defaults
├── hooks/useRecommendation.ts     the non-blocking, cancellable "generate" flow
├── lib/recommendationEngine.ts    pure, deterministic scoring + explanation
└── types.ts
```

Session state (`tasteProfile`/`lastRecommendation`/`favorites`) lives in `stores/concierge-store.ts` (project-root `stores/`, same convention `customizer-store.ts` established) — `sessionStorage`-persisted, per the brief's "AI state remains isolated... Persist session only."

## Fix (post-Sprint 5.2): missing zoom controls

`ConciergeCanvas` reused `CupCanvasLoader` directly but never wired up `CupZoomControls`/`useCupZoomControls` — the same real zoom slider + zoom-in/out/reset/fit-to-screen bar `CustomizerCanvas` already has. Drag/touch/keyboard rotation was never affected (built into `CupCanvasLoader` itself, not gated by `route`), but the visible scale control and explicit "reset view" affordance were genuinely missing here, a real inconsistency between this project's two product-inspection views. Fixed by mirroring `CustomizerCanvas.tsx`'s exact pattern — a wrapping `<div>` ref, `useCupZoomControls`, `zoomSource`/`CupZoomControls` — verified live (slider renders, is positioned correctly, and actually changes zoom on drag; zero console errors; full existing `concierge.spec.ts` suite still passing).

## Why not TanStack Query (for the scoring step itself)

`generateRecommendation` is a plain, synchronous, pure function — wrapping it in a simulated `fetch` just to get loading/cancellation behavior would be exactly the placeholder query ADR-0005 forbids. `useRecommendation.ts` gets the same real requirements (non-blocking, graceful loading, cancellation of abandoned requests) from React 19's own `useTransition` (which supports an async callback and keeps `isPending` true for its duration) plus a plain request-id token. **Sprint 5.2 update**: a real backend now exists, but the scoring computation itself is still correctly local — it's a deterministic rule engine over already-loaded data, not an I/O-bound operation, so wrapping it in `useTransition` remains the right call. What *did* change is where the candidate `drinks` list comes from: `ConciergeExperience` calls `features/menu/hooks/useMenuQuery` (populating `stores/menu-store.ts`), and `useRecommendation.ts` reads `useMenuStore.getState().drinks` from inside its `startTransition` callback — real, live menu data (including anything created through the new `/admin` UI), not the static `data/drinks.ts` array.

## Flow

1. `PreferenceQuestionnaire` reads/writes `tasteProfile` directly from `concierge-store` — every answer commits immediately (`taste-profile:updated` fires per field), there's nothing to "save" separately.
2. Submitting calls `useRecommendation`'s `generate()`, which runs inside `startTransition` (a real pacing beat under normal motion — "the concierge is considering your answers," skipped under reduced motion) and calls `generateRecommendation(profile, drinks, { currentCategory })` — `drinks` is the live-fetched menu list (`useMenuStore.getState().drinks`, see above); `currentCategory` is `customizer-store`'s own `baseDrinkCategory`, the brief's "existing recipe selections" signal, read directly rather than duplicated.
3. The result commits via `concierge-store`'s `setRecommendation`, which emits `ai:recommendation-ready` (an event typed since Sprint 0, its first real publisher).
4. `ConciergeCanvas` reads `lastRecommendation` and switches `CupCanvasLoader`'s `cameraPreset` from `"hero"` to `"ai"` — `CameraRig`'s smooth preset-to-preset interpolation (built Sprint 2.1, never exercised live until now) — and resolves `suggestedCustomizations` into real 3D `ingredientLayers` via `features/composer/`'s own `resolveIngredientLayers`, so the suggested drink visibly appears on the cup, not just in text.
5. `RecommendationPanel`/`DrinkComparison` render the explanation, confidence, suggestions, and alternatives. "Apply to Customizer" calls `concierge-store`'s `applyRecommendationToCustomizer` (which calls `customizer-store`'s own `setBaseDrink`/`addIngredient` directly — no duplicated model of what a drink+ingredient selection means) and navigates to `/customize?drink=<id>`, the same real routing Sprint 3.3 built for the menu's own CTA.
6. **Sprint 3.6**: `applyRecommendationToCustomizer` also calls `customizer-store`'s `markRecommendationApplied(recommendation.id)`, after the `setBaseDrink`/`addIngredient` calls (ordering matters — `setBaseDrink` clears the field on an actual drink change). This is how `features/cart/`'s `RecipeSnapshot.appliedRecommendationId` — "Applied AI recommendations," the brief's own words for what a cart line must preserve — traces back to a real recommendation without concierge/cart ever sharing a model: the customizer store is the one place both features read/write it.

**Sprint 3.8 (Final Polish)**: two real bugs found by a dedicated audit and fixed. (1) `scoreCaffeine` (`recommendationEngine.ts`) used the wrong named weight constant for 3 of its 6 branches (`TEMPERATURE_MATCH_WEIGHT`/`TEMPERATURE_MISMATCH_WEIGHT` instead of `CAFFEINE_MATCH_WEIGHT`) — a "regular" caffeine match scored 25% weaker than an equivalent "none"/"high" match, for no stated reason. Fixed, with a new regression test asserting the exact weight per branch so this class of bug can't ship silently again. (2) `ConciergeExperience`'s skeleton-to-result swap — this panel's single biggest payoff moment — had zero entrance motion, a bare conditional instead of the `AnimatePresence` pattern every sibling feature's equivalent state swap already uses (`CartExperience`'s empty→items). Now wrapped identically.

## Responsibilities

- **This feature owns**: the taste-profile model, the scoring/explanation engine, the questionnaire and recommendation UI, its own session state.
- **This feature borrows from `stores/customizer-store.ts`**: `baseDrinkCategory` (read, for "existing recipe selections") and `setBaseDrink`/`addIngredient` (called, for "Apply to Customizer") — never duplicated.
- **This feature borrows from `features/composer/`**: `INGREDIENTS`/`resolveIngredient`/`isIngredientCompatible` for suggestion/exclusion validation, and `resolveIngredientLayers` for the 3D reveal.
- **This feature borrows from `features/menu/`**: the live-fetched menu catalog (`useMenuStore`, hydrated by `useMenuQuery`) — the recommendation engine scores the real, current menu, including anything created through `/admin`, never a second hand-authored dataset. `resolveDrink`/`resolveCategory` (still the static file) are used only in `RecommendationPanel`/`DrinkComparison` to resolve an *already-scored* recommendation's `drinkId` back to display data — safe since the static and live data are verified identical, and those two components render a result, not a browsable list.
- **This feature borrows from `features/hero-cup/`**: the whole rendering pipeline, via `CupCanvasLoader`'s now-optional `cameraPreset` prop (Sprint 3.5's own addition) and the pre-existing `ingredientLayers` prop.
- **This feature does not own**: the 3D cup's rendering, the customizer's own state, or ingredient compatibility rules — all read from their owning feature.

## Known simplifications

- Scoring weights (`recommendationEngine.ts`) are hand-tuned constants against the real tag vocabulary, not learned from data — matches this project's "not a physics engine"/"not an LLM" honesty pattern for Sprint 3.4/3.5 respectively.
- Milk-forwardness has no structured data field (`deriveMilkForwardness`, a real, documented heuristic from tags + drink name) — the menu catalog was never designed with a "milk amount" field, and adding one just for this feature would be a `features/menu/` data-model change out of this sprint's scope.
- The confidence indicator normalizes against a fixed theoretical ceiling (`MAX_POSSIBLE_SCORE`, the sum of every rule's best-case weight), not a live distribution over the current catalog — simple, deterministic, and unit-tested to never be exceeded.

## Future extension

- **A real recommendation endpoint**: `lib/recommendationEngine.ts`'s pure `(profile, drinks, options) -> Recommendation` signature is still the contract a future real API would need to satisfy, if the scoring logic itself ever moves server-side (e.g. to personalize against order history Sprint 5.3 will introduce) — `useRecommendation.ts` remains the one place to swap the local call for a real TanStack Query mutation. Not done in Sprint 5.2: only the *candidate data* (the menu) moved to a real backend; the *scoring* stayed local, correctly, since it's still a fast, deterministic, client-side-appropriate computation with nothing to gain from a round trip.
