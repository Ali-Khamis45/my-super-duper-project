"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getMenu } from "@/lib/menu-client";
import { useMenuStore } from "@/stores/menu-store";

import { productSummaryToDrink } from "../lib/mapProductToDrink";

/** GET /api/v1/menu, mapped to `Drink[]` and mirrored into `useMenuStore` so non-hook consumers (`useRecommendation.ts`, called from inside a `startTransition`) can read the same list via `useMenuStore.getState()`. */
export function useMenuQuery() {
  const setDrinks = useMenuStore((state) => state.setDrinks);

  const query = useQuery({
    queryKey: ["menu"],
    queryFn: async () => (await getMenu()).map(productSummaryToDrink),
  });

  useEffect(() => {
    if (query.data) setDrinks(query.data);
  }, [query.data, setDrinks]);

  return query;
}
