import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTION } from "@/stores/customizer-store";

import { buildRecipeSnapshot } from "./buildRecipeSnapshot";

const FIXED_NOW = 1_700_000_000_000;
const FIXED_ID = "test-id-1";

describe("buildRecipeSnapshot", () => {
  it("returns null for an unresolvable drink id — never fabricates a snapshot", () => {
    const snapshot = buildRecipeSnapshot({
      baseDrinkId: "not-a-real-drink",
      productId: "product-x",
      baseDrinkCategory: "espresso",
      selection: DEFAULT_SELECTION,
      appliedRecommendationId: null,
    });
    expect(snapshot).toBeNull();
  });

  it("returns null when productId hasn't resolved yet — never builds an unorderable snapshot", () => {
    const snapshot = buildRecipeSnapshot({
      baseDrinkId: "mocha",
      productId: undefined,
      baseDrinkCategory: "espresso",
      selection: DEFAULT_SELECTION,
      appliedRecommendationId: null,
    });
    expect(snapshot).toBeNull();
  });

  it("denormalizes the drink name and computes unitPrice as drink.price + ingredients total", () => {
    const snapshot = buildRecipeSnapshot(
      {
        baseDrinkId: "mocha",
        productId: "product-mocha",
        baseDrinkCategory: "espresso",
        selection: { ...DEFAULT_SELECTION, ingredients: [{ ingredientId: "cream", quantity: 1 }] },
        appliedRecommendationId: null,
      },
      { id: FIXED_ID, now: FIXED_NOW },
    );
    expect(snapshot).not.toBeNull();
    expect(snapshot!.baseDrinkName).toBe("Mocha");
    expect(snapshot!.productId).toBe("product-mocha");
    // mocha: $5.50, cream: 0.75
    expect(snapshot!.unitPrice).toBeCloseTo(5.5 + 0.75);
  });

  it("is deterministic for fixed id/now, and carries the full selection verbatim (no data transformation)", () => {
    const input = {
      baseDrinkId: "classic-espresso",
      productId: "product-classic-espresso",
      baseDrinkCategory: "espresso" as const,
      selection: { ...DEFAULT_SELECTION, color: "charcoal" as const },
      appliedRecommendationId: "rec-42",
    };
    const a = buildRecipeSnapshot(input, { id: FIXED_ID, now: FIXED_NOW });
    const b = buildRecipeSnapshot(input, { id: FIXED_ID, now: FIXED_NOW });
    expect(a).toEqual(b);
    expect(a!.selection).toEqual(input.selection);
    expect(a!.appliedRecommendationId).toBe("rec-42");
    expect(a!.id).toBe(FIXED_ID);
    expect(a!.createdAt).toBe(FIXED_NOW);
  });

  it("generates a real id/timestamp when none is supplied", () => {
    const snapshot = buildRecipeSnapshot({
      baseDrinkId: "classic-espresso",
      productId: "product-classic-espresso",
      baseDrinkCategory: "espresso",
      selection: DEFAULT_SELECTION,
      appliedRecommendationId: null,
    });
    expect(snapshot!.id.length).toBeGreaterThan(0);
    expect(snapshot!.createdAt).toBeGreaterThan(0);
  });
});
