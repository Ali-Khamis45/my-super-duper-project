# composer

The Drink Composer — build a drink's recipe layer by layer inside `/customize`: an ingredient library with strict per-drink compatibility rules, an ordered layer stack (quantity, reorder, remove), curated presets, and a live recipe summary (name, ingredients, per-item and total pricing). Rendered inside `features/customizer/`'s panel, not a separate route — building a drink's recipe and a cup's cosmetics is one continuous session. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
composer/
├── components/
│   ├── ComposerSection.tsx       top-level composition, mounted inside CustomizerPanel
│   ├── IngredientAnnouncer.tsx   sr-only aria-live region, driven by ingredient:* events
│   ├── RecipeSummary.tsx         drink name/category, ingredient list + prices, total
│   ├── IngredientPresets.tsx     curated combos, filtered to what's compatible with the base drink
│   ├── IngredientLibrary.tsx     click-to-add + native-HTML5 drag-to-add, hover/focus preview
│   └── LayerStack.tsx            quantity +/-, up/down reorder, remove — the ordered recipe
├── data/{ingredients,presets}.ts   the 9-ingredient catalog + compatibility rules, 4 curated presets
├── lib/resolveIngredientLayers.ts  the one place `IngredientPlacement[]` becomes real `ResolvedIngredientLayer[]`
└── types.ts
```

Placement state (`ingredients: IngredientPlacement[]`) and the base-drink context (`baseDrinkId`/`baseDrinkCategory`) live in the same `stores/customizer-store.ts` Sprint 3.2 already built — no second, parallel state/undo system, per this sprint's own "Undo/Redo integration" instruction read literally.

## Flow

1. `/customize?drink=<id>` resolves against `features/menu/data/drinks.ts`'s `resolveDrink`; `CustomizerExperience` calls `setBaseDrink(drink.id, drink.category)` — session context, deliberately kept out of undo history (it's set once from the URL, not a swatch a user toggles).
2. `IngredientLibrary` renders one button per catalog ingredient, disabled when `isIngredientCompatible(ingredient, baseDrinkCategory)` is false or the ingredient is already placed — the brief's "strict rules" ("can't add ice to a hot espresso drink," concretely), enforced identically for click, native drag-and-drop (`CustomizerExperience`'s drop handler re-checks compatibility, never trusting the drag source alone), and presets (`IngredientPresets` only offers a combo when every ingredient in it is compatible).
3. Clicking/dropping calls the store's `addIngredient`, which appends a placement, advances undo/redo history, and emits `ingredient:added` + `recipe:changed`.
4. `LayerStack` renders the ordered placement list — quantity buttons call `updateIngredientQuantity`, up/down buttons call `reorderIngredient`, remove calls `removeIngredient`. List order *is* stack order: `resolveIngredientLayers` reads array position directly to compute each layer's height.
5. `CustomizerCanvas` computes `resolveIngredientLayers(selection.ingredients)` and passes the result to `CupCanvasLoader`'s `ingredientLayers` prop — the same 3D pipeline `hero-cup` owns, extended (not forked) with one more optional prop.
6. `RecipeSummary` reads `baseDrinkId`/`selection.ingredients` directly from the store and renders drink name, category, per-ingredient price (`priceModifier * quantity`), and the total (`drink.price + ingredientsTotal`).
7. `IngredientAnnouncer` subscribes to `ingredient:added`/`-removed`/`-updated`/`-reordered` and (when the id resolves to a composer preset) `preset:applied`, writing a short message into an `aria-live="polite"` region — the brief's "Screen-reader announcements" requirement, driven by events the store already emits rather than a second diff-the-state mechanism.

**Sprint 3.8 (Final Polish)**: two real fixes from a dedicated audit. `LayerStack`'s add/remove/reorder previously snapped instantly — now animates via `layout`/`AnimatePresence`, matching `features/menu/`'s `DrinkCard.tsx` handling of the identical "list reflow" shape. `RecipeSummary`'s derived total is now `useMemo`'d, matching `features/cart/`'s `PriceBreakdown.tsx` (which shares this feature's own `calculateIngredientsTotal.ts`) — the same "memoize derived totals" requirement, previously only applied on one side of that shared function's two call sites.

## Responsibilities

- **This feature owns**: the ingredient catalog, compatibility rules, presets, the placement-to-`ResolvedIngredientLayer[]` mapping, its own panel UI and screen-reader announcements.
- **This feature borrows from `stores/customizer-store.ts`**: placement state, undo/redo, the base-drink context — not owned here, this feature only calls the store's actions.
- **This feature borrows from `features/hero-cup/`**: `ingredient-ring`/`ingredient-sprinkles`/`ingredient-ice` registry entries, the material cache, and (Sprint 3.4, ice only) the shared liquid-physics simulation via `physicsRef` — this feature has zero rendering or physics code of its own; `resolveIngredientLayers` only produces data (including which registry entry an ingredient's `shape` maps to), `hero-cup` turns it into meshes and, for ice, real float/drift motion.
- **This feature borrows from `features/menu/`**: `resolveDrink`/`resolveCategory`, so the recipe summary never duplicates drink data.
- **This feature does not own**: the 3D cup's rendering, the customizer's cosmetic swatches (color/size/sleeve/lid/logo/material), or the drop-zone DOM element itself (that's `CustomizerExperience`'s).

## Known simplifications

- Drag-and-drop targets the whole canvas as one drop zone (`targetSlot: "cup"`), not per-layer 3D-space raycasted placement — a much larger undertaking genuinely out of this sprint's scope. Click-to-add is the fully accessible primary path; drag is a real, additional desktop-only layer on top, per the brief's "Drag-to-place *where applicable*."
- Reordering is up/down buttons, not drag-reorder — a deliberate accessibility choice (native keyboard/touch support for free, no extra ARIA machinery to invent).
- One ingredient per catalog entry per named type (one syrup flavor, one foam type, etc.) — a genuine, complete catalog for what exists today, the same "not artificially padded" reasoning `features/customizer/data/logos.ts` used in Sprint 3.2. A future flavor variant adds a new `id` under the same `category`, not a new category.

## Future extension

- **Sprint 3.4 (Physics Layer)**: ingredient layers are static, stacked meshes today — a future sprint could give the topmost layer surface tilt/settle behavior matching the coffee/foam physics work planned for that sprint.
- **A real backend**: `data/ingredients.ts`/`data/presets.ts`'s shapes are the contract a future catalog/pricing API would need to satisfy, matching `features/menu/README.md`'s and `features/customizer/README.md`'s own migration points.
- **Sprint 3.6 (Commerce)**: the recipe summary's `total` is display-only today — a natural input to a future cart line item once Commerce exists.
