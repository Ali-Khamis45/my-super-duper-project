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

**Sprint 3.3**: `CustomizerPanel` also renders `features/composer/`'s `ComposerSection` — the Drink Composer (ingredient library, layer stack, recipe summary) lives in its own feature folder, not inside `customizer/`, but shares this same store (`ingredients`/`baseDrinkId`/`baseDrinkCategory` fields, added to `CustomizerSelection`/`CustomizerStoreState` this sprint) and the same undo/redo history. `CustomizerExperience` also gained a `drinkId?: string` prop (from `/customize?drink=<id>`, resolved via `features/menu/data/drinks.ts`'s `resolveDrink`) and a drag-and-drop zone on the canvas wrapper for the composer's drag-to-add path.

## Flow

1. `app/customize/page.tsx` renders `CustomizerExperience` (client — needs the Zustand store from first render).
2. `CustomizerExperience` emits `customizer:opened`/`-closed` (mount/unmount) and lays out `CustomizerCanvas` + `CustomizerPanel`.
3. `CustomizerPanel` reads `selection`/`preview` from the store and renders one `VariantSwatchGroup` per category. Hovering or keyboard-focusing a swatch calls `setPreview`; clicking or pressing Enter/Space calls `select`, which commits, advances undo/redo history, and emits `variant:selected`.
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

- **Sprint 3.6 (Commerce)**: an "Add to cart" action naturally belongs here once a cart concept exists — not stubbed ahead of it.
- **A real backend**: `data/*.ts`'s shapes are the contract a future catalog/pricing API would need to satisfy, the same migration point `features/menu/README.md` names for its own data.
- **Per-part material finish**: if user feedback wants it, `resolvePartOverrides` is the one place that change would need to happen — the panel/store shapes would need a finish-per-category field instead of one global `material` selection.
