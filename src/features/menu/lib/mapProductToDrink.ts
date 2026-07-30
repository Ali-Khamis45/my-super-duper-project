import type { CategoryDto, ProductSummaryDto } from "@/lib/catalog-types";

import type { Drink, DrinkCategory, DrinkCategoryId } from "../types";
import { categoryIcons } from "./categoryIcons";

const KNOWN_CATEGORY_IDS: readonly DrinkCategoryId[] = ["espresso", "cold-brew", "seasonal", "tea"];

function toDrinkCategoryId(code: string): DrinkCategoryId {
  const match = KNOWN_CATEGORY_IDS.find((id) => id === code);
  if (!match) {
    throw new Error(`Unknown category code from backend: "${code}" — a new category needs a new entry in categoryIcons.ts before it can render.`);
  }
  return match;
}

/**
 * The static catalog's `id` values were always kebab-case product names (`"Classic Espresso"` →
 * `"classic-espresso"`) — verified against every one of `CatalogSeeder.cs`'s 14 seeded product
 * names before relying on it here. Deriving `id` this way (rather than serializing the backend's
 * real `Guid`) is what keeps `cart-store`/`customizer-store`/`recommendationEngine`'s existing
 * `baseDrinkId`/`snapshot` string-matching logic — and their tests — working unchanged; the real
 * `Guid` is still available via `productId` for anything that needs to call back to the API.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function productSummaryToDrink(dto: ProductSummaryDto): Drink {
  return {
    id: slugify(dto.name),
    productId: dto.id,
    name: dto.name,
    category: toDrinkCategoryId(dto.category),
    price: dto.price,
    tagline: dto.tagline,
    description: dto.description,
    tags: dto.tags,
  };
}

export function categoryDtoToDrinkCategory(dto: CategoryDto): DrinkCategory {
  const id = toDrinkCategoryId(dto.code);
  return { id, label: dto.name, icon: categoryIcons[id] };
}
