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
  coffeePhysicsQuality: "off" | "full";
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
    coffeePhysicsQuality: "full",
  },
  high: {
    dprRange: [1, 2],
    shadowMapSize: 2048,
    bloomIntensityMultiplier: 1,
    bloomEnabled: true,
    environmentResolutionScale: 1,
    maxParticleCount: 256,
    steamQuality: "full",
    coffeePhysicsQuality: "full",
  },
  medium: {
    dprRange: [1, 1.5],
    shadowMapSize: 1024,
    bloomIntensityMultiplier: 0.75,
    bloomEnabled: true,
    environmentResolutionScale: 0.75,
    maxParticleCount: 128,
    steamQuality: "placeholder",
    coffeePhysicsQuality: "off",
  },
  low: {
    dprRange: [1, 1],
    shadowMapSize: 512,
    bloomIntensityMultiplier: 0.5,
    bloomEnabled: true,
    environmentResolutionScale: 0.5,
    maxParticleCount: 48,
    steamQuality: "placeholder",
    coffeePhysicsQuality: "off",
  },
  minimal: {
    dprRange: [1, 1],
    shadowMapSize: 256,
    bloomIntensityMultiplier: 0,
    bloomEnabled: false,
    environmentResolutionScale: 0.5,
    maxParticleCount: 0,
    steamQuality: "placeholder",
    coffeePhysicsQuality: "off",
  },
};

export function resolveQualityPolicy(tier: QualityTier): QualityPolicy {
  return QUALITY_POLICY[tier];
}
