import { describe, expect, it } from "vitest";

import { resolveAssetQualityOptions } from "./assetQuality";

describe("resolveAssetQualityOptions", () => {
  it("high tier allows full anisotropy and preloading", () => {
    const options = resolveAssetQualityOptions("high");
    expect(options.maxAnisotropy).toBe(16);
    expect(options.preloadEnabled).toBe(true);
  });

  it("low tier caps anisotropy to 1 and disables preloading", () => {
    const options = resolveAssetQualityOptions("low");
    expect(options.maxAnisotropy).toBe(1);
    expect(options.preloadEnabled).toBe(false);
  });

  it("tiers are strictly ordered: high >= medium >= low on every numeric option", () => {
    const high = resolveAssetQualityOptions("high");
    const medium = resolveAssetQualityOptions("medium");
    const low = resolveAssetQualityOptions("low");
    expect(high.maxAnisotropy).toBeGreaterThanOrEqual(medium.maxAnisotropy);
    expect(medium.maxAnisotropy).toBeGreaterThanOrEqual(low.maxAnisotropy);
    expect(high.maxTextureSize).toBeGreaterThanOrEqual(medium.maxTextureSize);
    expect(medium.maxTextureSize).toBeGreaterThanOrEqual(low.maxTextureSize);
  });
});
