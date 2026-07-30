"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { searchProducts } from "@/lib/search-client";

import { productSummaryToDrink } from "../lib/mapProductToDrink";

const DEBOUNCE_MS = 300;

/** Debounces `query` before hitting `/api/v1/search` — a settled search, not one request per keystroke, the same "real, minimal event surface" discipline `MenuExperience`'s own `menu_searched` tracking already applies. Disabled entirely for an empty query (no network call, no loading flicker). */
export function useSearchQuery(query: string) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  return useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => {
      const result = await searchProducts(debounced);
      return result.items.map(productSummaryToDrink);
    },
    enabled: debounced.trim().length > 0,
  });
}
