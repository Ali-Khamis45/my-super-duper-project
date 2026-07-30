"use client";

import { useQuery } from "@tanstack/react-query";

import { getIngredients } from "@/lib/ingredient-client";

/** Raw `IngredientDto[]` (includes `sortOrder`, absent from the customer-facing mapped `Ingredient` shape) — shares the `["ingredients"]` query key with `features/composer/hooks/useIngredientsQuery`. */
export function useAdminIngredientsQuery() {
  return useQuery({
    queryKey: ["ingredients"],
    queryFn: getIngredients,
  });
}
