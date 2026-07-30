# customizer

The Interactive Cup Designer at `/customize`: live Color/Size/Sleeve/Lid/Logo/Material selection with a real-time 3D preview, hover-preview-before-commit, undo/redo, reset, and session-only preset saving. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
customizer/
├── components/
│   ├── CustomizerExperience.tsx  top-level composition, emits customizer:opened/-closed
│   ├── CustomizerCanvas.tsx      computes the effective look, renders CupCanvasLoader
│   ├── CustomizerPanel.tsx       composes 6 VariantSwatchGroup sections + controls
│   ├── VariantSwatchGroup.tsx    one category's swatch row — every category renders through this
│   ├── UndoRedoControls.tsx      Undo/Redo/Reset buttons, reading history state
│   └── PresetSaveControls.tsx    save-a-name / load / delete saved presets
├── data/{colors,sizes,sleeves,lids,logos,materials}.ts   curated, typed option catalogs
└── lib/resolvePartOverrides.ts   the one place a selection becomes real CupPartProps
```

Selection state lives in `stores/customizer-store.ts` (project-root `stores/`, not inside this feature folder) — a dedicated Zustand store, per this sprint's explicit "build a dedicated customization state, do not modify engine stores" instruction, `sessionStorage`-persisted ("persist only session state").

**Sprint 3.3**: `CustomizerPanel` also renders `features/composer/`'s `ComposerSection` — the Drink Composer (ingredient library, layer stack, recipe summary) lives in its own feature folder, not inside `customizer/`, but shares this same store (`ingredients`/`baseDrinkId`/`baseDrinkCategory` fields, added to `CustomizerSelection`/`CustomizerStoreState` this sprint) and the same undo/redo history. `CustomizerExperience` also gained a `drinkId?: string` prop (from `/customize?drink=<id>`) and a drag-and-drop zone on the canvas wrapper for the composer's drag-to-add path.

**Sprint 5.2 update**: that `drinkId` prop now resolves against the live Catalog API (`useMenuQuery().data`, `features/menu/hooks/`) instead of `features/menu/data/drinks.ts`'s `resolveDrink` — a product created through the new `/admin` UI must be customizable via `?drink=` too. Unresolvable/`undefined` still falls back to the store's own static default (`baseDrinkId: "classic-espresso"`) exactly as before; nothing about this store's own shape changed.

**Sprint 5.3 update — this store's shape did change.** `setBaseDrink(drinkId, category)` gained a required `productId: string | undefined` middle parameter (now `setBaseDrink(drinkId, productId, category)`), and the store itself gained `baseDrinkProductId` — the real backend `Product.Id`, required before `features/cart/`'s "Add to Cart" can build an orderable snapshot at all (see that feature's own README). `CustomizerExperience`'s `?drink=` effect (described above) now passes `drink.productId` from the live catalog through to `setBaseDrink`; a same-drink call always re-sets `baseDrinkProductId` even when `drinkId` is unchanged, which is exactly how a concierge-originated selection (static catalog, no real productId) gets corrected to the real one once this effect re-runs against live data — see `stores/customizer-store.ts`'s own doc comment on `baseDrinkProductId`.

**Sprint 3.6**: `CustomizerPanel` renders `features/cart/`'s `AddToCartButton` at the very end of the panel, after a `Separator` — the cart feature owns the button, this feature only hosts it, the same "own vs. host" split as `ComposerSection`. `stores/customizer-store.ts` gained `appliedRecommendationId: string | null` (cleared only when `setBaseDrink` actually changes drinks, so ingredient/cosmetic edits after applying a recommendation don't lose the link) plus two actions this feature and `features/cart/` both call: `markRecommendationApplied(recommendationId)` (called by `concierge-store` right after it applies a recommendation) and `loadRecipeSnapshot(baseDrinkId, baseDrinkCategory, selection, appliedRecommendationId)` (called by `features/cart/`'s "Edit" action to push a cart item's full recipe back into live selection state in one step, no field-by-field reconstruction — gained a `baseDrinkProductId` parameter in the same Sprint 5.3 signature change noted below, `loadRecipeSnapshot(baseDrinkId, baseDrinkProductId, baseDrinkCategory, selection, appliedRecommendationId)`).

**Sprint 3.8 (Final Polish)**: a real perf bug found by a dedicated audit and fixed. `CustomizerPanel` used to read the whole `selection`/`preview` objects and compute per-category props (`selectedId`/`previewId`/`onCommit`/`onPreview`) for all six `VariantSwatchGroup`s — meaning hovering *any single swatch in any one category* re-rendered `CustomizerPanel` and recreated all six groups' props, contradicting that component's own doc comment about per-category isolation. Fixed by making `VariantSwatchGroup` itself store-aware: it now takes only `category` as a prop and subscribes directly to `customizer-store`'s `selection[category]`/`preview?.[category]` slices (each a primitive `string | null`), so hovering one category's swatch only ever re-renders that one group — `CustomizerPanel` itself no longer touches the store at all. Also fixed: `VariantSwatchGroup`'s label truncation (`max-w-16`, too narrow for real labels like "Large (16oz)") and `CategoryFilter`-adjacent naming drift in this component's own doc comment.

## Flow

1. `app/customize/page.tsx` renders `CustomizerExperience` (client — needs the Zustand store from first render).
2. `CustomizerExperience` emits `customizer:opened`/`-closed` (mount/unmount) and lays out `CustomizerCanvas` + `CustomizerPanel`.
3. `CustomizerPanel` renders one `VariantSwatchGroup` per category, passing only `category` (Sprint 3.8 — see above); each group independently subscribes to its own `selection`/`preview` slice. Hovering or keyboard-focusing a swatch calls `setPreview`; clicking or pressing Enter/Space calls `select`, which commits, advances undo/redo history, and emits `variant:selected`.
4. `CustomizerCanvas` computes the *effective* look as `{...selection, ...preview}` every render, resolves it to real `CupPartProps` via `resolvePartOverrides` (`features/customizer/lib/`), and renders `features/hero-cup/components/CupCanvasLoader` with those overrides — the same 3D rendering pipeline the Hero route uses, extended (Sprint 3.2) with optional override props rather than duplicated.
5. `UndoRedoControls`/`PresetSaveControls` read and call the store directly; no prop drilling from `CustomizerPanel` beyond what each section's `VariantSwatchGroup` instance needs.

## Responsibilities

- **This feature owns**: the customization selection state, the six data catalogs, the selection-to-`CupPartProps` mapping, its own panel UI and analytics events.
- **This feature borrows from `engine/`/`design-system/`**: `GlowCard`-adjacent primitives (`Button`/`Input`/`Tooltip`/`Separator`), `usePrefersReducedMotion`, `track()`/`appEvents`.
- **This feature borrows from `features/hero-cup/`**: the entire 3D rendering pipeline (`CupCanvasLoader` → `CupCanvas` → `CupScene` → `CupAssembly` → parts) — reused via its now-optional override props, not forked or duplicated.
- **This feature borrows from `features/composer/`** (Sprint 3.3): `ComposerSection`, rendered inside `CustomizerPanel` — the recipe/ingredient UI is that feature's own, this one only hosts it and supplies the drag-and-drop zone + the resolved `ingredientLayers` passed into `CustomizerCanvas`.
- **This feature does not own**: the 3D cup's geometry, materials, or interaction mechanics (drag-rotate, keyboard control, touch, WebGL context recovery) — all inherited unchanged from `hero-cup`. Ingredient/recipe data and rules belong to `features/composer/`, not here.

## Known simplifications

- "Cup Variants" maps to size (`scale`) only — no second cup silhouette exists to offer as a shape variant.
- Material finish (Glossy/Matte/Metallic) applies uniformly to cup/sleeve/lid together, not per part — a coherent "look" rather than three independent finish pickers, a deliberate scope choice.
- No routed detail/share view for a saved preset, no export beyond the current session — matches "Preset Saving (session only)" literally.

## Future extension

- **A real backend**: `data/*.ts`'s shapes are the contract a future catalog/pricing API would need to satisfy, the same migration point `features/menu/README.md` names for its own data.
- **Per-part material finish**: if user feedback wants it, `resolvePartOverrides` is the one place that change would need to happen — the panel/store shapes would need a finish-per-category field instead of one global `material` selection.

## Update (Sprint 3.9 — Cup Scale + Camera Controls fix)

A real, previously-unknown layout bug found during this sprint's own manual verification: `CustomizerExperience.tsx`'s canvas column (`lg:h-auto lg:flex-1`) let flexbox's default cross-axis stretch grow it to match the options panel's own content height — the six swatch groups plus price/combos routinely push that panel past 1200px, badly distorting the canvas's aspect ratio and, via `CameraRig`'s aspect-driven horizontal FOV, cropping the cup far more aggressively than any preset intends. Fixed by capping the column to the viewport height and making it sticky (`lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]`) — a real "premium configurator" pattern (the 3D view stays in place while you scroll options), not just a framing patch. `CustomizerCanvas.tsx` also now wires up `features/hero-cup/hooks/useCupZoomControls.ts` (seeded at a modest 1.15 zoom-out, more modest than the Hero route's 1.25 since the "product" framing here was already tighter) and renders `CupZoomControls` — see `hero-cup/README.md`'s own Sprint 3.9 section for the shared mechanism.
