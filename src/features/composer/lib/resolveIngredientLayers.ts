import { FOAM_HEIGHT } from "@/features/hero-cup/parts/ProceduralFoam";
import type { ResolvedIngredientLayer } from "@/features/hero-cup/registry/types";
import type { IngredientPlacement } from "@/stores/customizer-store";

import { resolveIngredient } from "../data/ingredients";

const LAYER_BASE_HEIGHT = FOAM_HEIGHT + 0.03;
/** Stack order comes from array order, not ingredient identity — reordering `placements` changes which layer sits highest. */
const LAYER_SPACING = 0.045;

/**
 * The one place a `CustomizerSelection.ingredients` list becomes real
 * `ResolvedIngredientLayer[]` — the composer's equivalent of
 * `features/customizer/lib/resolvePartOverrides.ts`. Pure and synchronous,
 * same reasoning: easy to unit test, safe to call every render without
 * premature memoization.
 */
export function resolveIngredientLayers(placements: IngredientPlacement[]): ResolvedIngredientLayer[] {
  const layers: ResolvedIngredientLayer[] = [];

  placements.forEach((placement, index) => {
    const ingredient = resolveIngredient(placement.ingredientId);
    if (!ingredient) return;

    const height = LAYER_BASE_HEIGHT + index * LAYER_SPACING;
    // Quantity affects footprint, not a separate geometry — 1x/2x/3x scales
    // the same shared shape wider/taller rather than allocating more meshes.
    const quantityScale = 1 + (placement.quantity - 1) * 0.18;

    if (ingredient.shape === "sprinkles") {
      layers.push({
        key: placement.ingredientId,
        partName: "ingredient-sprinkles",
        position: [0, height, 0],
        scale: quantityScale,
        visible: true,
      });
      return;
    }

    if (ingredient.shape === "ice") {
      layers.push({
        key: placement.ingredientId,
        partName: "ingredient-ice",
        position: [0, height, 0],
        scale: quantityScale,
        materialOverrides: { color: ingredient.color },
        visible: true,
      });
      return;
    }

    layers.push({
      key: placement.ingredientId,
      partName: "ingredient-ring",
      position: [0, height, 0],
      // Uniform, not `[x, 1, x]` non-uniform — simpler, and non-uniform
      // scale was investigated as a candidate cause of a real headless-GPU
      // instability found this sprint (see this sprint's review); ruled
      // out as the actual cause (the instability reproduces on unrelated,
      // untouched code too), but uniform scale is still the simpler and
      // equally correct choice, so it stays.
      scale: quantityScale,
      materialOverrides: { color: ingredient.color },
      visible: true,
    });
  });

  return layers;
}
