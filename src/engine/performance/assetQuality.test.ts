import { describe, expect, it } from "vitest";

import { QUALITY_TIER_ORDER } from "./types";
import { resolveAssetQualityOptions } from "./assetQuality";

describe("resolveAssetQualityOptions", () => {
  it("ultra and high tier both allow full anisotropy and preloading", () => {
    expect(resolveAssetQualityOptions("ultra").maxAnisotropy).toBe(16);
    expect(resolveAssetQualityOptions("high").maxAnisotropy).toBe(16);
    expect(resolveAssetQualityOptions("high").preloadEnabled).toBe(true);
  });

  it("minimal tier caps anisotropy to 1, the smallest texture size, and disables preloading", () => {
    const options = resolveAssetQualityOptions("minimal");
    expect(options.maxAnisotropy).toBe(1);
    expect(options.preloadEnabled).toBe(false);
    expect(options.maxTextureSize).toBe(256);
  });

  it("tiers are monotonically non-increasing across the full ultra -> minimal order on every numeric option", () => {
    for (let i = 0; i < QUALITY_TIER_ORDER.length - 1; i++) {
      const better = resolveAssetQualityOptions(QUALITY_TIER_ORDER[i]!);
      const worse = resolveAssetQualityOptions(QUALITY_TIER_ORDER[i + 1]!);
      expect(better.maxAnisotropy).toBeGreaterThanOrEqual(worse.maxAnisotropy);
      expect(better.maxTextureSize).toBeGreaterThanOrEqual(worse.maxTextureSize);
    }
  });
});
