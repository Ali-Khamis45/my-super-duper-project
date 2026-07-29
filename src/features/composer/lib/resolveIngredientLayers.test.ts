import { describe, expect, it } from "vitest";

import { FOAM_HEIGHT } from "@/features/hero-cup/parts/ProceduralFoam";
import type { IngredientPlacement } from "@/stores/customizer-store";

import { resolveIngredientLayers } from "./resolveIngredientLayers";

function placement(ingredientId: string, quantity = 1): IngredientPlacement {
  return { ingredientId, quantity };
}

describe("resolveIngredientLayers", () => {
  it("returns an empty array for no placements", () => {
    expect(resolveIngredientLayers([])).toEqual([]);
  });

  it("resolves a ring-shaped ingredient to an 'ingredient-ring' layer with its color and base height", () => {
    const [layer] = resolveIngredientLayers([placement("chocolate")]);
    expect(layer?.key).toBe("chocolate");
    expect(layer?.partName).toBe("ingredient-ring");
    expect(layer?.visible).toBe(true);
    expect(layer?.position).toEqual([0, FOAM_HEIGHT + 0.03, 0]);
    expect(layer?.materialOverrides?.color).toBeDefined();
  });

  it("resolves sprinkles to an 'ingredient-sprinkles' layer with no color override", () => {
    const [layer] = resolveIngredientLayers([placement("sprinkles")]);
    expect(layer?.partName).toBe("ingredient-sprinkles");
    expect(layer?.materialOverrides).toBeUndefined();
  });

  it("stacks layers by array order, each one higher than the last", () => {
    const layers = resolveIngredientLayers([placement("chocolate"), placement("cream"), placement("caramel")]);
    const heights = layers.map((layer) => layer.position![1]!);
    expect(heights[0]).toBeLessThan(heights[1]!);
    expect(heights[1]).toBeLessThan(heights[2]!);
  });

  it("reordering the input placements changes which layer sits highest", () => {
    const forward = resolveIngredientLayers([placement("chocolate"), placement("cream")]);
    const reversed = resolveIngredientLayers([placement("cream"), placement("chocolate")]);
    expect(forward[1]?.key).toBe("cream");
    expect(reversed[1]?.key).toBe("chocolate");
  });

  it("higher quantity scales the layer up", () => {
    const [q1] = resolveIngredientLayers([placement("chocolate", 1)]);
    const [q3] = resolveIngredientLayers([placement("chocolate", 3)]);
    expect(q3?.scale).toBeGreaterThan(q1?.scale as number);
  });

  it("skips an unresolvable ingredient id instead of throwing", () => {
    const layers = resolveIngredientLayers([placement("not-a-real-ingredient")]);
    expect(layers).toEqual([]);
  });
});
