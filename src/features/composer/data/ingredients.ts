import { Candy, CloudSnow, Cookie, Droplet, Flower2, IceCreamCone, Milk, Snowflake, Sparkles } from "lucide-react";

import { brandAccentColor, creamColor, espressoColor } from "@/engine/theme/ColorSchemes";

import type { DrinkCategoryId } from "@/features/menu/types";

import type { Ingredient } from "../types";

function hex(color: ReturnType<typeof creamColor>): string {
  return `#${color.getHexString()}`;
}

/**
 * One real ingredient per named type this sprint (a genuine, complete
 * catalog for what exists today — the same "not artificially padded"
 * reasoning `data/logos.ts` used in Sprint 3.2). A future sprint adding a
 * second syrup flavor, say, adds a new `id` under the same `category`, not
 * a new category — `IngredientCategoryId` and `Ingredient.id` are already
 * distinct types for exactly that reason.
 */
export const INGREDIENTS: readonly Ingredient[] = [
  {
    id: "foam",
    name: "Extra Foam",
    category: "foam",
    icon: CloudSnow,
    priceModifier: 0.5,
    compatibleWith: ["espresso", "seasonal"],
    color: hex(creamColor(100)),
    shape: "ring",
  },
  {
    id: "cream",
    name: "Whipped Cream",
    category: "cream",
    icon: IceCreamCone,
    priceModifier: 0.75,
    compatibleWith: ["espresso", "cold-brew", "seasonal"],
    color: hex(creamColor(50)),
    shape: "ring",
  },
  {
    id: "chocolate",
    name: "Chocolate Drizzle",
    category: "chocolate",
    icon: Cookie,
    priceModifier: 0.6,
    compatibleWith: ["espresso", "seasonal"],
    color: hex(espressoColor(700)),
    shape: "ring",
  },
  {
    id: "caramel",
    name: "Caramel Drizzle",
    category: "caramel",
    icon: Droplet,
    priceModifier: 0.6,
    compatibleWith: ["espresso", "cold-brew", "seasonal"],
    color: hex(brandAccentColor(500)),
    shape: "ring",
  },
  {
    id: "cinnamon",
    name: "Cinnamon Dust",
    category: "cinnamon",
    icon: Flower2,
    priceModifier: 0.3,
    compatibleWith: ["espresso", "seasonal", "tea"],
    color: hex(espressoColor(500)),
    shape: "ring",
  },
  {
    id: "sprinkles",
    name: "Sprinkles",
    category: "sprinkles",
    icon: Sparkles,
    priceModifier: 0.4,
    compatibleWith: ["espresso", "seasonal"],
    color: "transparent",
    shape: "sprinkles",
  },
  {
    id: "ice",
    name: "Ice Cubes",
    category: "ice",
    icon: Snowflake,
    priceModifier: 0,
    compatibleWith: ["cold-brew"],
    color: "#dceef5",
    shape: "ice",
  },
  {
    id: "milk",
    name: "Steamed Milk",
    category: "milk",
    icon: Milk,
    priceModifier: 0.5,
    compatibleWith: ["espresso", "tea", "seasonal"],
    color: hex(creamColor(100)),
    shape: "ring",
  },
  {
    id: "syrup",
    name: "Vanilla Syrup",
    category: "syrup",
    icon: Candy,
    priceModifier: 0.5,
    compatibleWith: "all",
    color: "#e8d5a3",
    shape: "ring",
  },
];

export function resolveIngredient(id: string): Ingredient | undefined {
  return INGREDIENTS.find((entry) => entry.id === id);
}

export function isIngredientCompatible(ingredient: Ingredient, drinkCategory: DrinkCategoryId): boolean {
  return ingredient.compatibleWith === "all" || ingredient.compatibleWith.includes(drinkCategory);
}
