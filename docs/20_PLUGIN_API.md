# 20 — Plugin API

Sprint 0 deliverable. How a new drink, ingredient, theme, material, shader, or interaction is added by populating a registry — never by modifying an existing manager's logic. This is [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) made concrete per category, and the resolution of [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 10 (Future Plugin Marketplace).

## What kind of "plugin" this is, stated once

**First-party, compile-time, same-codebase extension** — a plugin here is a new registry entry shipped in a normal commit by this project's own contributors, not untrusted third-party code loaded at runtime. [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) already worked through why a sandboxed, versioned-public-API, security-reviewed third-party plugin marketplace isn't justified by anything on the 24-phase roadmap — that conclusion stands. This document defines the registration API each of the six categories below actually needs for Milestones 3-10, which is a real, near-term requirement, distinct from that speculative marketplace.

## New drinks

A drink is data, not code. Adding one never touches a manager:

```ts
interface Product {
  id: string;
  name: string;
  defaultColorway: MaterialCacheKey; // see 22_MANAGER_INTERFACES.md
  defaultIngredients: string[]; // ingredient ids
  price: number;
}

registerProduct(matchaProduct); // appends to a Product[] list — no other code changes
```

Switching to a product rehydrates the Customizer store (Milestone 4) with its defaults — see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 8 (Product Switching).

## New ingredients

Ingredients are a **second instance of the same `createPartRegistry` factory** the cup parts already use — proof the pattern generalizes, not a new mechanism:

```ts
const ingredientRegistry = createPartRegistry<IngredientName, IngredientPartProps>();
ingredientRegistry.register("oat-milk-splash", "procedural", OatMilkSplash);
```

`IInteractionManager`'s generic `GestureEvent`s drive drag/drop; the feature layer (not the Interaction Manager) interprets a completed drop and emits `ingredient:dropped` (see [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md)) — the same generic-manager/semantic-feature split used everywhere else.

## New themes

A theme is a `ThemeToPresetMap` entry (see [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)) pairing an `EnvironmentPresetName` + `LightingPresetName`, plus the CSS/token-level dark/light variant if it's a UI theme rather than a purely 3D mood (e.g. a promotional "holiday" lighting mood needs no new UI theme at all — see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s Promotional Themes extensibility example):

```ts
lightingManager.register("holiday-evening", { ambient: {...}, directional: {...}, bloom: {...} });
environmentManager.register("holiday-evening", { source: {...}, intensity: 1.1 });
```

## New materials

A new surface type is a new `MaterialCacheKey.surface` union member + its factory function, registered alongside the existing five (`ceramic`/`liquid`/`foam`/`sleeve`/`lid`):

```ts
export function createMatteCeramicMaterial(colorHex: string): THREE.MeshPhysicalMaterial { ... }
// registered in MaterialFactory's internal switch — the one place a "plugin" here does touch
// existing file content, because MaterialFactory's factory-selection switch is itself the registry.
```

## New shaders

A new shader family is a new folder under `engine/shaders/` satisfying `ShaderMaterialFactory<TUniforms>` (see [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)), importing the shared `engine/shaders/common/` utilities. No existing shader family's file changes.

```
engine/shaders/
  common/           noise.ts, remap.ts, uniforms.ts — shared, imported, never modified per-shader
  steam/            SteamMaterial.ts — Milestone 2
  foam/, coffee/    Milestone 3, same shape
  <new-family>/     Milestone N — same shape, zero changes to steam/foam/coffee
```

## New interactions

A new `GestureType` union member (e.g. `"pinch"` for a future zoom gesture) — existing consumers pattern-matching on the gestures they already handle are unaffected by an unrecognized new type flowing past them, since `IInteractionManager`'s recognizer emits a closed but growable union and consumers only act on cases they explicitly match.

## The one honest exception: registries themselves are still code

Every category above eventually bottoms out in a real file (`cupPartRegistry.ts`, `MaterialFactory.ts`'s switch, `engine/shaders/`'s folder tree) that a contributor edits to add an entry. That's expected and is **not** a Zero Rewrite Policy violation — see [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)'s explicit distinction between growing a registry's *data* and rewriting a manager's *logic*. What none of the six categories above ever require: touching `CupAssembly`'s render loop, `resolveCupPart`'s resolution algorithm, `EffectsStack`'s switch beyond adding a case for a genuinely new effect *type* (not a new drink/ingredient/theme/material/shader), or any other manager's actual behavior for the entries that already exist.

## Related

[17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)
