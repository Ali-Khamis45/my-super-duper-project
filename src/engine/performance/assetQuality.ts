import type { QualityTier } from "./types";

/**
 * Quality Tier Integration for the asset platform (docs/16_ENGINEERING_SPRINTS.md
 * Sprint 2.2) — read-only consumer of `performanceManager.tier`, per the
 * one-directionality rule (docs/15_ARCHITECTURE_FREEZE.md): this module
 * never writes to Performance Manager, only reads a tier value passed to it.
 * Applies uniformly to any real texture *and* is the documented seam a
 * future self-hosted HDR load (`EnvironmentPresetDefinition`'s `"file"`
 * source variant) would use — no separate HDR-specific quality table, since
 * an HDRI is, for this purpose, just another texture.
 */
export interface AssetQualityOptions {
  maxAnisotropy: number;
  /** Longest edge, px — a cap the loader should respect once real multi-resolution asset variants exist. */
  maxTextureSize: number;
  /** Low tier skips eager `preload()` calls for non-critical assets — see docs/14_PERFORMANCE_STRATEGY.md's streaming section. */
  preloadEnabled: boolean;
}

const TIER_OPTIONS: Record<QualityTier, AssetQualityOptions> = {
  ultra: { maxAnisotropy: 16, maxTextureSize: 2048, preloadEnabled: true },
  high: { maxAnisotropy: 16, maxTextureSize: 2048, preloadEnabled: true },
  medium: { maxAnisotropy: 8, maxTextureSize: 1024, preloadEnabled: true },
  low: { maxAnisotropy: 1, maxTextureSize: 512, preloadEnabled: false },
  minimal: { maxAnisotropy: 1, maxTextureSize: 256, preloadEnabled: false },
};

export function resolveAssetQualityOptions(tier: QualityTier): AssetQualityOptions {
  return TIER_OPTIONS[tier];
}
