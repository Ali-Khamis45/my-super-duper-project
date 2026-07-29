import type { MaterialSurface, SurfaceParams } from "./types";

/**
 * Material Presets: the PBR parameters each surface renders with, named and
 * exported rather than left as inline magic numbers scattered across part
 * components — the same values Milestone 1's `MaterialFactory.ts` already
 * used, formalized here as the single source every `create*Material`
 * function and validation/fallback path reads from. Ceramic's numbers are
 * this sprint's Creative Budget change (see `themeBridge.ts` and this
 * sprint's review) — everything else is an unchanged carry-over.
 */
export const SURFACE_PRESETS: Record<MaterialSurface, SurfaceParams> = {
  ceramic: { roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1 },
  liquid: { roughness: 0.12, metalness: 0, envMapIntensity: 1.4 },
  foam: { roughness: 0.9, metalness: 0, clearcoat: 0 },
  sleeve: { roughness: 0.95, metalness: 0 },
  lid: { roughness: 0.25, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2, transmission: 0.05 },
  glass: { roughness: 0.02, metalness: 0, transmission: 0.95, clearcoat: 1, clearcoatRoughness: 0.02 },
  metal: { roughness: 0.3, metalness: 1, clearcoat: 0 },
  /** Sprint 3.3 — a glossy-drizzle-ish default (low roughness, a hint of clearcoat) every ring-style ingredient layer starts from; `resolveIngredientLayers` overrides `color` per ingredient, never these finish values, so all 8 ring ingredients share one consistent sheen. */
  ingredient: { roughness: 0.2, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.15 },
};
