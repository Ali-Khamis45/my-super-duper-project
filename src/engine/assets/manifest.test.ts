import { describe, expect, it } from "vitest";

import { registerAsset, resolveAsset, resolveAssetUrl } from "./manifest";

describe("asset manifest", () => {
  it("throws a clear, actionable error for an unregistered key", () => {
    expect(() => resolveAsset("does-not-exist")).toThrow(/not registered/);
  });

  it("resolves a registered entry", () => {
    registerAsset("test-cup", { path: "/models/cup/cup.glb", version: "1" });
    expect(resolveAsset("test-cup")).toEqual({ path: "/models/cup/cup.glb", version: "1" });
  });

  it("resolveAssetUrl appends the version as a cache-busting query string, not a filename change", () => {
    registerAsset("test-sleeve", { path: "/models/sleeve/sleeve.glb", version: "3" });
    expect(resolveAssetUrl("test-sleeve")).toBe("/models/sleeve/sleeve.glb?v=3");
  });
});
