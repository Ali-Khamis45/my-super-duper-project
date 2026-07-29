import { describe, expect, it } from "vitest";

import { INGREDIENTS, isIngredientCompatible, resolveIngredient } from "./ingredients";

describe("resolveIngredient", () => {
  it("finds an ingredient by id", () => {
    expect(resolveIngredient("chocolate")?.name).toBe("Chocolate Drizzle");
  });

  it("returns undefined for an unknown id", () => {
    expect(resolveIngredient("not-a-real-ingredient")).toBeUndefined();
  });
});

describe("isIngredientCompatible", () => {
  it("an ingredient with compatibleWith: 'all' (syrup) is compatible with every drink category", () => {
    const syrup = resolveIngredient("syrup")!;
    expect(isIngredientCompatible(syrup, "espresso")).toBe(true);
    expect(isIngredientCompatible(syrup, "tea")).toBe(true);
    expect(isIngredientCompatible(syrup, "cold-brew")).toBe(true);
    expect(isIngredientCompatible(syrup, "seasonal")).toBe(true);
  });

  it("enforces the 'strict rule' example from the brief: ice cannot go on a tea (or any hot-brew) drink", () => {
    const ice = resolveIngredient("ice")!;
    expect(isIngredientCompatible(ice, "cold-brew")).toBe(true);
    expect(isIngredientCompatible(ice, "tea")).toBe(false);
    expect(isIngredientCompatible(ice, "espresso")).toBe(false);
    expect(isIngredientCompatible(ice, "seasonal")).toBe(false);
  });

  it("cinnamon is compatible with tea but not cold-brew", () => {
    const cinnamon = resolveIngredient("cinnamon")!;
    expect(isIngredientCompatible(cinnamon, "tea")).toBe(true);
    expect(isIngredientCompatible(cinnamon, "cold-brew")).toBe(false);
  });

  it("every catalog entry has at least one compatible drink category (no dead ingredients)", () => {
    for (const ingredient of INGREDIENTS) {
      const compatibleWithSomething =
        ingredient.compatibleWith === "all" || ingredient.compatibleWith.length > 0;
      expect(compatibleWithSomething).toBe(true);
    }
  });
});
