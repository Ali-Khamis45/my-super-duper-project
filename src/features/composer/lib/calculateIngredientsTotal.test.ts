import { describe, expect, it } from "vitest";

import { calculateIngredientsTotal } from "./calculateIngredientsTotal";

describe("calculateIngredientsTotal", () => {
  it("returns 0 for no placements", () => {
    expect(calculateIngredientsTotal([])).toBe(0);
  });

  it("sums priceModifier * quantity across placements", () => {
    // chocolate: 0.6, cream: 0.75 (see data/ingredients.ts)
    const total = calculateIngredientsTotal([
      { ingredientId: "chocolate", quantity: 2 },
      { ingredientId: "cream", quantity: 1 },
    ]);
    expect(total).toBeCloseTo(0.6 * 2 + 0.75 * 1);
  });

  it("skips an unresolvable ingredient id instead of throwing", () => {
    expect(calculateIngredientsTotal([{ ingredientId: "not-real", quantity: 1 }])).toBe(0);
  });
});
