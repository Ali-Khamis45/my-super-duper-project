# concierge

The AI Coffee Concierge at `/concierge`: a preference questionnaire, a real explained recommendation (drink, reasoning, confidence, suggested customizations, alternatives), and one-click apply to the customizer. "AI" here means a deterministic, fully explainable rule engine over the real menu catalog — not an LLM call; see `lib/recommendationEngine.ts`'s own doc comment for why. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
concierge/
├── components/
│   ├── ConciergeExperience.tsx    top-level composition, focus management
│   ├── ConciergeCanvas.tsx        wires cameraPreset + ingredientLayers reveal
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

## Why not TanStack Query

ADR-0005 reserves TanStack Query for "a real endpoint — no placeholder queries," and this project has no backend. `generateRecommendation` is a plain, synchronous, pure function — wrapping it in a simulated `fetch` just to get loading/cancellation behavior would be exactly the placeholder query that ADR forbids. `useRecommendation.ts` gets the same real requirements (non-blocking, graceful loading, cancellation of abandoned requests) from React 19's own `useTransition` (which supports an async callback and keeps `isPending` true for its duration) plus a plain request-id token — a deliberate, documented deviation from what docs/15_ARCHITECTURE_FREEZE.md's "AI Barista Recommendations" scenario anticipated wiring, reasoned through rather than followed blindly now that this sprint's actual brief makes clear the "AI" is a transparent rule engine, not a remote model.

## Flow

1. `PreferenceQuestionnaire` reads/writes `tasteProfile` directly from `concierge-store` — every answer commits immediately (`taste-profile:updated` fires per field), there's nothing to "save" separately.
2. Submitting calls `useRecommendation`'s `generate()`, which runs inside `startTransition` (a real pacing beat under normal motion — "the concierge is considering your answers," skipped under reduced motion) and calls `generateRecommendation(profile, drinks, { currentCategory })` — `currentCategory` is `customizer-store`'s own `baseDrinkCategory`, the brief's "existing recipe selections" signal, read directly rather than duplicated.
3. The result commits via `concierge-store`'s `setRecommendation`, which emits `ai:recommendation-ready` (an event typed since Sprint 0, its first real publisher).
4. `ConciergeCanvas` reads `lastRecommendation` and switches `CupCanvasLoader`'s `cameraPreset` from `"hero"` to `"ai"` — `CameraRig`'s smooth preset-to-preset interpolation (built Sprint 2.1, never exercised live until now) — and resolves `suggestedCustomizations` into real 3D `ingredientLayers` via `features/composer/`'s own `resolveIngredientLayers`, so the suggested drink visibly appears on the cup, not just in text.
5. `RecommendationPanel`/`DrinkComparison` render the explanation, confidence, suggestions, and alternatives. "Apply to Customizer" calls `concierge-store`'s `applyRecommendationToCustomizer` (which calls `customizer-store`'s own `setBaseDrink`/`addIngredient` directly — no duplicated model of what a drink+ingredient selection means) and navigates to `/customize?drink=<id>`, the same real routing Sprint 3.3 built for the menu's own CTA.
6. **Sprint 3.6**: `applyRecommendationToCustomizer` also calls `customizer-store`'s `markRecommendationApplied(recommendation.id)`, after the `setBaseDrink`/`addIngredient` calls (ordering matters — `setBaseDrink` clears the field on an actual drink change). This is how `features/cart/`'s `RecipeSnapshot.appliedRecommendationId` — "Applied AI recommendations," the brief's own words for what a cart line must preserve — traces back to a real recommendation without concierge/cart ever sharing a model: the customizer store is the one place both features read/write it.

## Responsibilities

- **This feature owns**: the taste-profile model, the scoring/explanation engine, the questionnaire and recommendation UI, its own session state.
- **This feature borrows from `stores/customizer-store.ts`**: `baseDrinkCategory` (read, for "existing recipe selections") and `setBaseDrink`/`addIngredient` (called, for "Apply to Customizer") — never duplicated.
- **This feature borrows from `features/composer/`**: `INGREDIENTS`/`resolveIngredient`/`isIngredientCompatible` for suggestion/exclusion validation, and `resolveIngredientLayers` for the 3D reveal.
- **This feature borrows from `features/menu/`**: the real `drinks` catalog and `resolveDrink`/`resolveCategory` — the recommendation engine scores the actual menu, never a second hand-authored dataset.
- **This feature borrows from `features/hero-cup/`**: the whole rendering pipeline, via `CupCanvasLoader`'s now-optional `cameraPreset` prop (Sprint 3.5's own addition) and the pre-existing `ingredientLayers` prop.
- **This feature does not own**: the 3D cup's rendering, the customizer's own state, or ingredient compatibility rules — all read from their owning feature.

## Known simplifications

- Scoring weights (`recommendationEngine.ts`) are hand-tuned constants against the real tag vocabulary, not learned from data — matches this project's "not a physics engine"/"not an LLM" honesty pattern for Sprint 3.4/3.5 respectively.
- Milk-forwardness has no structured data field (`deriveMilkForwardness`, a real, documented heuristic from tags + drink name) — the menu catalog was never designed with a "milk amount" field, and adding one just for this feature would be a `features/menu/` data-model change out of this sprint's scope.
- The confidence indicator normalizes against a fixed theoretical ceiling (`MAX_POSSIBLE_SCORE`, the sum of every rule's best-case weight), not a live distribution over the current catalog — simple, deterministic, and unit-tested to never be exceeded.

## Future extension

- **A real backend**: if this project ever gains a real recommendation endpoint, `lib/recommendationEngine.ts`'s pure `(profile, drinks, options) -> Recommendation` signature is the contract a real API would need to satisfy — `useRecommendation.ts` would be the one place to swap the local call for a real TanStack Query mutation, matching the Architecture Freeze's original anticipation, once ADR-0005's "real endpoint" condition is actually met.
