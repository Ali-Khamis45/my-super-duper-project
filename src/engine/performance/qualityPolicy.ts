import type { QualityTier } from "./types";

/**
 * The central policy table every tier-sensitive system reads from —
 * "Allow runtime adaptation of: Shadow quality, Bloom intensity,
 * Environment resolution, Texture resolution, Anisotropy, Post-processing
 * quality, Particle budgets, Future Steam quality, Future Coffee Physics
 * quality." Texture resolution/anisotropy stay owned by
 * `assetQuality.ts`'s `resolveAssetQualityOptions` (already built, Sprint
 * 2.2) — not duplicated here.
 *
 * "Never disable a feature if it can instead scale": every parameter below
 * is a *scale*, not a boolean, with exactly one exception — `bloomEnabled`
 * only goes `false` at the single most extreme tier (`minimal`), matching
 * the tier table docs/14_PERFORMANCE_STRATEGY.md already specified before
 * this sprint existed ("Low: Bloom Disabled" — carried forward as
 * "Minimal" once the tier set grew from 3 to 5).
 */
export interface QualityPolicy {
  dprRange: [number, number];
  shadowMapSize: number;
  bloomIntensityMultiplier: number;
  bloomEnabled: boolean;
  environmentResolutionScale: number;
  /** Milestone 5 — typed now, no real particle system exists yet to consume it. */
  maxParticleCount: number;
  /** Milestone 2+/3 — typed placeholders for effects that are still placeholder-grade (Sprint 2.4) or unbuilt. */
  steamQuality: "placeholder" | "full";
  /**
   * Sprint 3.4's first real consumer — reshaped from the original
   * `coffeePhysicsQuality: "off" | "full"` placeholder (zero real callers,
   * confirmed before changing it — same "shape it correctly at its first
   * real consumer" precedent as `materialOverrides`/`colorway` in earlier
   * sprints). A plain `"off" | "full"` boolean-in-disguise would have
   * repeated the one exception this table's own doc comment already calls
   * out (`bloomEnabled`) — this sprint's explicit brief is "Never disable
   * physics entirely. Scale quality gracefully," so every tier below keeps
   * `intensity` nonzero. Deliberately a plain inline shape, not an import
   * from `engine/physics` — same reasoning as `steamQuality` above not
   * importing from `engine/shaders`: this table only ever describes *how
   * much*, structurally compatible with whatever shape the real consumer
   * needs, without this performance-tier module reaching into a specific
   * feature's types (the one-directionality rule).
   */
  coffeePhysics: {
    /** 0-1, multiplies tilt/ripple/foam-lag/ice-lag displacement amplitude — never 0. */
    intensity: number;
    /** How many concurrent ripple waves a tier allows (of a fixed 4-slot pool) — never 0. */
    maxActiveRipples: number;
    /** Whether foam/ice run their own independent spring follower, or cheaply alias a scaled copy of the primary tilt signal. */
    secondaryMotion: boolean;
  };
  /**
   * Sprint 3.7's first real consumer — `features/storytelling/`'s
   * `StoryCanvas`. Same "scale, never disable" shape as `coffeePhysics`
   * above: the brief's own "Quality tiers must automatically scale
   * storytelling effects" is read literally as *scale*, consistent with
   * this table's one already-stated exception being `bloomEnabled` alone.
   */
  storytellingEffects: {
    /** 0-1, multiplies the steam/coffee/foam `uStorytellingProgress`-driven boost — never 0. */
    shaderBoostIntensity: number;
    /** How many of a chapter's featured ingredients actually render (of a fixed, small pool) — never 0. */
    maxFeaturedIngredients: number;
  };
}

const QUALITY_POLICY: Record<QualityTier, QualityPolicy> = {
  ultra: {
    dprRange: [1, 2],
    shadowMapSize: 2048,
    bloomIntensityMultiplier: 1.1,
    bloomEnabled: true,
    environmentResolutionScale: 1,
    maxParticleCount: 512,
    steamQuality: "full",
    coffeePhysics: { intensity: 1, maxActiveRipples: 4, secondaryMotion: true },
    storytellingEffects: { shaderBoostIntensity: 1, maxFeaturedIngredients: 3 },
  },
  high: {
    dprRange: [1, 2],
    shadowMapSize: 2048,
    bloomIntensityMultiplier: 1,
    bloomEnabled: true,
    environmentResolutionScale: 1,
    maxParticleCount: 256,
    steamQuality: "full",
    coffeePhysics: { intensity: 1, maxActiveRipples: 4, secondaryMotion: true },
    storytellingEffects: { shaderBoostIntensity: 1, maxFeaturedIngredients: 3 },
  },
  medium: {
    dprRange: [1, 1.5],
    shadowMapSize: 1024,
    bloomIntensityMultiplier: 0.75,
    bloomEnabled: true,
    environmentResolutionScale: 0.75,
    maxParticleCount: 128,
    steamQuality: "placeholder",
    coffeePhysics: { intensity: 0.7, maxActiveRipples: 3, secondaryMotion: true },
    storytellingEffects: { shaderBoostIntensity: 0.7, maxFeaturedIngredients: 3 },
  },
  low: {
    dprRange: [1, 1],
    shadowMapSize: 512,
    bloomIntensityMultiplier: 0.5,
    bloomEnabled: true,
    environmentResolutionScale: 0.5,
    maxParticleCount: 48,
    steamQuality: "placeholder",
    coffeePhysics: { intensity: 0.45, maxActiveRipples: 2, secondaryMotion: false },
    storytellingEffects: { shaderBoostIntensity: 0.5, maxFeaturedIngredients: 2 },
  },
  minimal: {
    dprRange: [1, 1],
    shadowMapSize: 256,
    bloomIntensityMultiplier: 0,
    bloomEnabled: false,
    environmentResolutionScale: 0.5,
    maxParticleCount: 0,
    steamQuality: "placeholder",
    coffeePhysics: { intensity: 0.25, maxActiveRipples: 1, secondaryMotion: false },
    storytellingEffects: { shaderBoostIntensity: 0.25, maxFeaturedIngredients: 1 },
  },
};

export function resolveQualityPolicy(tier: QualityTier): QualityPolicy {
  return QUALITY_POLICY[tier];
}
