import { describe, expect, it } from "vitest";

import { materialOverridesToVariant } from "./materialOverridesToVariant";

describe("materialOverridesToVariant", () => {
  it("returns the base unchanged when there are no overrides — the Hero route's exact pre-Sprint-3.2 cache key", () => {
    expect(materialOverridesToVariant("high", undefined)).toBe("high");
    expect(materialOverridesToVariant(undefined, undefined)).toBeUndefined();
  });

  it("encodes roughness/metalness/clearcoat into the variant when overrides are present", () => {
    const variant = materialOverridesToVariant("high", { roughness: 0.7, metalness: 0, clearcoat: 0.1 });
    expect(variant).toBe("high-r0.7-m0-c0.1");
  });

  it("produces distinct variants for distinct override combinations — the whole point of the cache-key fix", () => {
    const glossy = materialOverridesToVariant("high", { roughness: 0.12, metalness: 0, clearcoat: 1 });
    const matte = materialOverridesToVariant("high", { roughness: 0.7, metalness: 0, clearcoat: 0.1 });
    expect(glossy).not.toBe(matte);
  });

  it("produces the same variant for the same override combination — real cache reuse, not just non-collision", () => {
    const first = materialOverridesToVariant("high", { roughness: 0.25, metalness: 0.85, clearcoat: 0.3 });
    const second = materialOverridesToVariant("high", { roughness: 0.25, metalness: 0.85, clearcoat: 0.3 });
    expect(first).toBe(second);
  });

  it("falls back to a literal placeholder base when overrides exist but no base was given (sleeve/lid's case)", () => {
    const variant = materialOverridesToVariant(undefined, { roughness: 0.7, metalness: 0, clearcoat: 0.1 });
    expect(variant).toBe("override-r0.7-m0-c0.1");
  });
});
