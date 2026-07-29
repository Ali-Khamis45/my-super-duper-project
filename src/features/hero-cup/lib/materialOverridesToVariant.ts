import type { CupPartProps } from "../registry/types";

/**
 * Sprint 3.2's first real consumer of a `lib/` folder in this feature — an
 * earlier draft's `cupConfig.ts` placeholder was removed in Milestone 1 for
 * having zero consumers (see `README.md`'s Architecture section); this one
 * has three real callers (`ProceduralCup`/`Sleeve`/`Lid`) from the moment
 * it's added.
 *
 * Turns a part's `materialOverrides` into the `MaterialCacheKey.variant`
 * string every one of those parts passes to `getOrCreateMaterial`.
 * `base` carries whatever the part already varied its cache key by before
 * this sprint (the lighting preset name for the ceramic cup; `undefined`
 * for sleeve/lid, which never had a `variant` field at all) — passing it
 * through unchanged when there's no override means the *default* (no
 * customizer override) case produces the exact same key string as before
 * this sprint, byte-for-byte, so every existing cache entry the Hero route
 * relies on stays a real hit, not silently invalidated by this change.
 * Only when overrides are present does the key grow to also encode
 * roughness/metalness/clearcoat, so two customizer selections with
 * different finishes never collide, and revisiting an already-seen
 * combination (undo/redo, re-picking a swatch) is a real cache hit rather
 * than a fresh GLSL compile.
 */
export function materialOverridesToVariant(base: string | undefined, materialOverrides: CupPartProps["materialOverrides"]): string | undefined {
  if (!materialOverrides) return base;
  const { roughness, metalness, clearcoat } = materialOverrides;
  return `${base ?? "override"}-r${roughness ?? "_"}-m${metalness ?? "_"}-c${clearcoat ?? "_"}`;
}
