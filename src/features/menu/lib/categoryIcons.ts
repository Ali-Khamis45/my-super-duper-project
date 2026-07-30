import { Coffee, Leaf, Snowflake, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { DrinkCategoryId } from "../types";

/**
 * A category's icon has no backend representation (`CategoryDto` deliberately excludes it — a
 * Lucide component reference can't be serialized) and never will; this is the frontend-only half
 * of "replace the static catalog," extracted from `data/categories.ts` so the *icon* stays local
 * while the *list of categories and their labels* now comes from the real backend.
 */
export const categoryIcons: Record<DrinkCategoryId, LucideIcon> = {
  espresso: Coffee,
  "cold-brew": Snowflake,
  seasonal: Sparkles,
  tea: Leaf,
};
