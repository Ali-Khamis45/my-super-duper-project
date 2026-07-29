import type { QualityTier } from "@/engine/performance/types";
import type { ThemeName } from "@/engine/theme/ThemeEngine";

/**
 * Every surface type this platform produces production-ready materials
 * for. `glass`/`metal` have no current consumer (no cup part needs them
 * yet) — registered anyway per this sprint's explicit "production-ready
 * materials for... Future custom materials" requirement; a pure, tested
 * factory function is cheap, safe infrastructure, unlike a subsystem with
 * no possible consumer (contrast the Audio Pipeline decision in
 * docs/reviews/sprint-2.2-review.md).
 */
export type MaterialSurface = "ceramic" | "sleeve" | "lid" | "liquid" | "foam" | "glass" | "metal" | "ingredient";

/**
 * Frozen in docs/22_MANAGER_INTERFACES.md's `IMaterialManager` entry — a
 * structured type, not a free-form string, per the leaky-abstraction
 * finding in docs/18_ENGINEERING_CONTRACTS.md's Review.
 */
export interface MaterialCacheKey {
  surface: MaterialSurface;
  colorHex: string;
  variant?: string;
}

/**
 * The "Uniform Binding Layer" reframed for this sprint: no custom shader
 * exists yet (that's Sprint 2.4), so there is no GLSL uniform to bind. What
 * *is* real is a consistent set of inputs every material creation decision
 * can read — Theme and Quality Tier today, Interaction/Time once a shader
 * consumes them. One shape, read-only, never duplicated per call site.
 */
export interface MaterialContext {
  theme: ThemeName;
  qualityTier: QualityTier;
}

/** Every surface's tunable PBR parameters — the shape `presets.ts` and `materialOverrides` both speak. */
export interface SurfaceParams {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  envMapIntensity?: number;
}
