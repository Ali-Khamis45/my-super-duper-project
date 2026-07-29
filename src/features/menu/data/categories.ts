import { Coffee, Leaf, Snowflake, Sparkles } from "lucide-react";

import type { DrinkCategory } from "../types";

export const categories: DrinkCategory[] = [
  { id: "espresso", label: "Espresso", icon: Coffee },
  { id: "cold-brew", label: "Cold Brew", icon: Snowflake },
  { id: "seasonal", label: "Seasonal", icon: Sparkles },
  { id: "tea", label: "Tea", icon: Leaf },
];

export function resolveCategory(id: DrinkCategory["id"]): DrinkCategory {
  const category = categories.find((entry) => entry.id === id);
  if (!category) throw new Error(`Unknown drink category: "${id}"`);
  return category;
}
