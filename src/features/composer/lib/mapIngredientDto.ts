import type { DrinkCategoryId } from "@/features/menu/types";
import type { IngredientDto } from "@/lib/catalog-types";

import type { Ingredient, IngredientCategoryId } from "../types";
import { ingredientIcons } from "./ingredientIcons";

const KNOWN_INGREDIENT_IDS: readonly IngredientCategoryId[] = [
  "foam",
  "cream",
  "chocolate",
  "caramel",
  "cinnamon",
  "sprinkles",
  "ice",
  "milk",
  "syrup",
];

function toIngredientCategoryId(code: string): IngredientCategoryId {
  const match = KNOWN_INGREDIENT_IDS.find((id) => id === code);
  if (!match) {
    throw new Error(`Unknown ingredient code from backend: "${code}" — a new ingredient type needs a new entry in ingredientIcons.ts before it can render.`);
  }
  return match;
}

/**
 * `IngredientDto.id`/`.category` are already the same stable string code
 * (`"foam"`, `"milk"`, …) the frontend's own `Ingredient.id`/`.category` use — no slug
 * derivation needed here, unlike `mapProductToDrink.ts`'s products (see `IngredientDto.cs`'s own
 * doc comment for why the backend deliberately mirrors this shape field-for-field).
 */
export function ingredientDtoToIngredient(dto: IngredientDto): Ingredient {
  const id = toIngredientCategoryId(dto.id);
  return {
    id,
    name: dto.name,
    category: toIngredientCategoryId(dto.category),
    icon: ingredientIcons[id],
    priceModifier: dto.priceModifier,
    compatibleWith: dto.compatibleWith === "all" ? "all" : (dto.compatibleWith as DrinkCategoryId[]),
    color: dto.color,
    shape: dto.shape,
  };
}
