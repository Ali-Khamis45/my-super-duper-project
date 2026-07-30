"use client";

import { useQuery } from "@tanstack/react-query";

import { getIngredients } from "@/lib/ingredient-client";

import { ingredientDtoToIngredient } from "../lib/mapIngredientDto";

/**
 * GET /api/v1/ingredients, mapped to `Ingredient[]`. No dedicated Zustand store for this one —
 * unlike drinks/categories, nothing outside the composer's own hook tree needs the full
 * ingredient list (the concierge's candidate-ingredient suggestions stay on the static,
 * backend-identical `data/ingredients.ts`, per that module's own reasoning), so a store here
 * would just mirror the query cache with no unique state to justify it.
 */
export function useIngredientsQuery() {
  return useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => (await getIngredients()).map(ingredientDtoToIngredient),
  });
}
