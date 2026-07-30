import { describe, expect, it } from "vitest";

import type { IngredientDto } from "@/lib/catalog-types";

import { ingredientDtoToIngredient } from "./mapIngredientDto";

function makeIngredientDto(overrides: Partial<IngredientDto> = {}): IngredientDto {
  return {
    id: "foam",
    name: "Extra Foam",
    category: "foam",
    priceModifier: 0.5,
    compatibleWith: ["espresso", "seasonal"],
    color: "#fff",
    shape: "ring",
    sortOrder: 0,
    ...overrides,
  };
}

describe("ingredientDtoToIngredient", () => {
  it("maps a category-specific ingredient straight through, attaching the local icon", () => {
    const ingredient = ingredientDtoToIngredient(makeIngredientDto());

    expect(ingredient).toMatchObject({
      id: "foam",
      name: "Extra Foam",
      category: "foam",
      priceModifier: 0.5,
      compatibleWith: ["espresso", "seasonal"],
      color: "#fff",
      shape: "ring",
    });
    expect(ingredient.icon).toBeDefined();
  });

  it('preserves "all" compatibility rather than expanding it to a list', () => {
    const ingredient = ingredientDtoToIngredient(makeIngredientDto({ id: "syrup", category: "syrup", compatibleWith: "all" }));

    expect(ingredient.compatibleWith).toBe("all");
  });

  it("throws on an unknown ingredient code rather than silently mislabeling it", () => {
    expect(() => ingredientDtoToIngredient(makeIngredientDto({ id: "oat-milk", category: "oat-milk" }))).toThrow(/Unknown ingredient code/);
  });
});
