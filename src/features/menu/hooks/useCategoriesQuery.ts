"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getCategories } from "@/lib/category-client";
import { useCategoryStore } from "@/stores/category-store";

import { categoryDtoToDrinkCategory } from "../lib/mapProductToDrink";

/** GET /api/v1/categories, mapped to `DrinkCategory[]` (icon attached locally) and mirrored into `useCategoryStore`. */
export function useCategoriesQuery() {
  const setCategories = useCategoryStore((state) => state.setCategories);

  const query = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await getCategories()).map(categoryDtoToDrinkCategory),
  });

  useEffect(() => {
    if (query.data) setCategories(query.data);
  }, [query.data, setCategories]);

  return query;
}
