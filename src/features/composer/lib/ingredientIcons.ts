import { Candy, CloudSnow, Cookie, Droplet, Flower2, IceCreamCone, Milk, Snowflake, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { IngredientCategoryId } from "../types";

/** Extracted from `data/ingredients.ts` for the same reason `menu/lib/categoryIcons.ts` exists — an ingredient's icon has no backend representation and never will. */
export const ingredientIcons: Record<IngredientCategoryId, LucideIcon> = {
  foam: CloudSnow,
  cream: IceCreamCone,
  chocolate: Cookie,
  caramel: Droplet,
  cinnamon: Flower2,
  sprinkles: Sparkles,
  ice: Snowflake,
  milk: Milk,
  syrup: Candy,
};
