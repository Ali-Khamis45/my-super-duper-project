"use client";

import { useQuery } from "@tanstack/react-query";

import { getIngredientCategories } from "@/lib/ingredient-client";

export function useIngredientCategoriesQuery() {
  return useQuery({
    queryKey: ["ingredient-categories"],
    queryFn: getIngredientCategories,
  });
}
