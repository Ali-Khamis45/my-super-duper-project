"use client";

import { useQuery } from "@tanstack/react-query";

import { getCategories } from "@/lib/category-client";

/**
 * The raw `CategoryDto[]` (real Guid `id`, `sortOrder` included) — deliberately not
 * `features/menu/hooks/useCategoriesQuery`, which maps to the customer-facing `DrinkCategory`
 * shape and discards both of those in favor of the stable code (see `categoryDtoToDrinkCategory`).
 * Shares the same `["categories"]` query key, so both hooks read/invalidate the same cache entry
 * without a second network round trip.
 */
export function useAdminCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
}
