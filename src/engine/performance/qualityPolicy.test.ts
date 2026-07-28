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
});
