import type { LucideIcon } from "lucide-react";

import type { DrinkCategoryId } from "@/features/menu/types";

/**
 * The 9 named types from Sprint 3.3's brief. "Future ingredients must
 * register through the existing registry system" — the *rendering* side of
 * that is `hero-cup/registry/cupPartRegistry.ts` (2 real entries,
 * `"ingredient-ring"`/`"ingredient-sprinkles"`, reused across every
 * ingredient here via `shape`); this union is the *data* side, extended the
 * same additive way every other curated catalog in this project is.
 */
export type IngredientCategoryId =
  | "foam"
  | "cream"
  | "chocolate"
  | "caramel"
  | "cinnamon"
  | "sprinkles"
  | "ice"
  | "milk"
  | "syrup";

/**
 * Which registered hero-cup part renders this ingredient. Sprinkles (Sprint
 * 3.3) is the one ingredient given a genuinely distinct *shape*; ice
 * (Sprint 3.4) keeps the shared ring shape but gets genuinely distinct
 * *behavior* (float/drift, see `ProceduralIngredientIce.tsx`) — two
 * different reasons an ingredient can need its own registry entry.
 */
export type IngredientShape = "ring" | "sprinkles" | "ice";

export interface Ingredient {
  id: IngredientCategoryId;
  name: string;
  category: IngredientCategoryId;
  icon: LucideIcon;
  priceModifier: number;
  /** "Strict rules like you can't add tea to coffee" — enforced at the UI layer (incompatible ingredients render disabled, never callable), not inside the generic store. */
  compatibleWith: DrinkCategoryId[] | "all";
  /** A real hex color, `"transparent"` only for `shape: "sprinkles"` (rendered as a multi-color instanced cluster — see `ProceduralIngredientSprinkles.tsx`, no single "sprinkles color" exists). */
  color: string;
  shape: IngredientShape;
}

export interface IngredientPreset {
  id: string;
  name: string;
  description: string;
  ingredientIds: IngredientCategoryId[];
}
