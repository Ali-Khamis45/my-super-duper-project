import type { IngredientPlacement } from "@/stores/customizer-store";

import { resolveIngredient } from "../data/ingredients";

/**
 * Sprint 3.6 — extracted from `RecipeSummary.tsx`'s own inline calculation
 * so `features/cart/`'s recipe-snapshot pricing can reuse the exact same
 * formula instead of a second, duplicated one ("reuse existing... pricing
 * model," the brief's own words). Pure: same `placements` always produces
 * the same total, no store reads.
 */
export function calculateIngredientsTotal(placements: readonly IngredientPlacement[]): number {
  return placements.reduce((sum, placement) => {
    const ingredient = resolveIngredient(placement.ingredientId);
    return sum + (ingredient ? ingredient.priceModifier * placement.quantity : 0);
  }, 0);
}
