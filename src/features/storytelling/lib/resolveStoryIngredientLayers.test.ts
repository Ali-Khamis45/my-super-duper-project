import { describe, expect, it } from "vitest";

import { resolveStoryIngredientLayers } from "./resolveStoryIngredientLayers";

describe("resolveStoryIngredientLayers", () => {
  it("returns one layer per real ingredient id, silently skipping an unknown id", () => {
    const layers = resolveStoryIngredientLayers(["caramel", "chocolate", "not-a-real-ingredient"], 0.5);
    expect(layers).toHaveLength(2);
  });

  it("resolves sprinkles/ice to their own dedicated part names, everything else to ingredient-ring", () => {
    const layers = resolveStoryIngredientLayers(["caramel", "sprinkles", "ice"], 0.5);
    const byId = Object.fromEntries(layers.map((layer) => [layer.key, layer.partName]));
    expect(byId["story-caramel"]).toBe("ingredient-ring");
    expect(byId["story-sprinkles"]).toBe("ingredient-sprinkles");
    expect(byId["story-ice"]).toBe("ingredient-ice");
  });

  it("is invisible before progress clears the near-zero threshold, visible just after", () => {
    const atZero = resolveStoryIngredientLayers(["caramel"], 0);
    const justAfter = resolveStoryIngredientLayers(["caramel"], 0.05);
    expect(atZero[0]?.visible).toBe(false);
    expect(justAfter[0]?.visible).toBe(true);
  });

  it("never fully collapses the orbit radius to zero even at progress 1 (a real, visible settled position)", () => {
    const settled = resolveStoryIngredientLayers(["caramel"], 1);
    const position = settled[0]?.position;
    const radius = position ? Math.hypot(position[0], position[2]) : 0;
    expect(radius).toBeGreaterThan(0.15);
  });

  it("is deterministic for a fixed (ids, progress) pair", () => {
    const a = resolveStoryIngredientLayers(["caramel", "chocolate"], 0.35);
    const b = resolveStoryIngredientLayers(["caramel", "chocolate"], 0.35);
    expect(a).toEqual(b);
  });

  it("clamps out-of-range progress rather than producing a negative or overshot radius", () => {
    const overshoot = resolveStoryIngredientLayers(["caramel"], 5);
    const clamped = resolveStoryIngredientLayers(["caramel"], 1);
    expect(overshoot).toEqual(clamped);
  });
});
