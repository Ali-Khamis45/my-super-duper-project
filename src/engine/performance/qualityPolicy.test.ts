import { describe, expect, it } from "vitest";

import { QUALITY_TIER_ORDER } from "./types";
import { resolveQualityPolicy } from "./qualityPolicy";

describe("resolveQualityPolicy", () => {
  it("bloom is only disabled at the single most extreme tier (minimal) — every other tier scales it, never disables it", () => {
    for (const tier of QUALITY_TIER_ORDER) {
      const policy = resolveQualityPolicy(tier);
      if (tier === "minimal") {
        expect(policy.bloomEnabled).toBe(false);
      } else {
        expect(policy.bloomEnabled).toBe(true);
      }
    }
  });

  it("shadow map size, DPR ceiling, and bloom intensity are monotonically non-increasing from ultra to minimal", () => {
    for (let i = 0; i < QUALITY_TIER_ORDER.length - 1; i++) {
      const better = resolveQualityPolicy(QUALITY_TIER_ORDER[i]!);
      const worse = resolveQualityPolicy(QUALITY_TIER_ORDER[i + 1]!);
      expect(better.shadowMapSize).toBeGreaterThanOrEqual(worse.shadowMapSize);
      expect(better.dprRange[1]).toBeGreaterThanOrEqual(worse.dprRange[1]);
      expect(better.bloomIntensityMultiplier).toBeGreaterThanOrEqual(worse.bloomIntensityMultiplier);
      expect(better.maxParticleCount).toBeGreaterThanOrEqual(worse.maxParticleCount);
    }
  });

  it("ultra and high both keep steam at full quality; medium and below keep it at placeholder", () => {
    expect(resolveQualityPolicy("ultra").steamQuality).toBe("full");
    expect(resolveQualityPolicy("high").steamQuality).toBe("full");
    expect(resolveQualityPolicy("medium").steamQuality).toBe("placeholder");
    expect(resolveQualityPolicy("minimal").steamQuality).toBe("placeholder");
  });

  it("coffeePhysics.intensity is never 0 at any tier — 'never disable physics entirely,' scaled instead, unlike bloomEnabled's single documented exception", () => {
    for (const tier of QUALITY_TIER_ORDER) {
      expect(resolveQualityPolicy(tier).coffeePhysics.intensity).toBeGreaterThan(0);
    }
  });

  it("coffeePhysics.maxActiveRipples is never 0 at any tier", () => {
    for (const tier of QUALITY_TIER_ORDER) {
      expect(resolveQualityPolicy(tier).coffeePhysics.maxActiveRipples).toBeGreaterThan(0);
    }
  });

  it("coffeePhysics.intensity and maxActiveRipples are monotonically non-increasing from ultra to minimal", () => {
    for (let i = 0; i < QUALITY_TIER_ORDER.length - 1; i++) {
      const better = resolveQualityPolicy(QUALITY_TIER_ORDER[i]!).coffeePhysics;
      const worse = resolveQualityPolicy(QUALITY_TIER_ORDER[i + 1]!).coffeePhysics;
      expect(better.intensity).toBeGreaterThanOrEqual(worse.intensity);
      expect(better.maxActiveRipples).toBeGreaterThanOrEqual(worse.maxActiveRipples);
    }
  });

  it("secondaryMotion (foam/ice's own spring follower) is only turned off at the two lowest tiers — 'reduce secondary motion,' still present as a cheaper alias, never absent", () => {
    expect(resolveQualityPolicy("ultra").coffeePhysics.secondaryMotion).toBe(true);
    expect(resolveQualityPolicy("high").coffeePhysics.secondaryMotion).toBe(true);
    expect(resolveQualityPolicy("medium").coffeePhysics.secondaryMotion).toBe(true);
    expect(resolveQualityPolicy("low").coffeePhysics.secondaryMotion).toBe(false);
    expect(resolveQualityPolicy("minimal").coffeePhysics.secondaryMotion).toBe(false);
  });
});
